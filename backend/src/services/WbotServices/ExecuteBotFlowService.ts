import * as Sentry from "@sentry/node";

import BotFlow from "../../models/BotFlow";
import BotStep from "../../models/BotStep";
import Ticket from "../../models/Ticket";
import { whatsappProvider } from "../../providers/WhatsApp/whatsappProvider";
import { logger } from "../../utils/logger";
import formatBody from "../../helpers/Mustache";
import { ContactPayload } from "../../handlers/handleWhatsappEvents";

// ====================================================================
// ExecuteBotFlowService
// --------------------------------------------------------------------
// Responsável por executar um BotFlow (fluxo de triagem/coleta) para
// um ticket que já tem fila associada mas ainda não foi assumido por
// atendente humano. É invocado pelo handleMessage sempre que uma
// mensagem válida chega.
//
// Comportamento (idempotente — pode ser chamado a cada mensagem):
//
//   1. Busca o BotFlow enabled vinculado à fila do ticket.
//      - Se não houver, retorna sem fazer nada (nenhuma automação).
//
//   2. Se o ticket ainda não tem botStepId (fluxo não iniciado),
//      inicia pelo step com menor stepOrder, persiste o estado no
//      ticket e envia a mensagem do step para o cliente.
//
//   3. Se o ticket já tem botStepId (fluxo em andamento), interpreta
//      a mensagem do cliente como resposta ao step atual:
//      - Match por número da opção (ex: "2") OU por texto igual ao
//        label da opção.
//      - Se bateu numa opção com `queueId`, transfere o ticket para
//        essa fila (e se a nova fila tiver fluxo, inicia o primeiro
//        step desse novo fluxo na sequência).
//      - Se bateu numa opção com `nextStepId`, avança para esse step.
//      - Se não bateu em nada, incrementa botInvalidAttempts e
//        reenvia o menu atual. Após MAX_INVALID_ATTEMPTS, encerra o
//        fluxo (ticket volta para `pending` — humano assume).
//
//   4. Quando um step não tem `options`, ou a opção escolhida não
//      define nextStepId nem queueId, considera o fluxo concluído:
//      limpa botFlowId/botStepId e o ticket fica aguardando humano.
// ====================================================================

// Limite de respostas inválidas antes de desistir do fluxo e liberar
// o ticket para atendimento humano.
const MAX_INVALID_ATTEMPTS = 3;

// Formato canônico de uma opção de step, conforme persistido em
// BotStep.options (JSON). nextStepId aponta para outro step do mesmo
// fluxo; queueId transfere o ticket para outra fila (encerrando o
// fluxo atual). Se ambos forem undefined, a opção encerra o fluxo.
type StepOption = { label: string; nextStepId?: number; queueId?: number };

// Monta a mensagem do step com o menu numerado das opções anexado.
// Usa formatBody para interpolar variáveis do contato (ex: {{name}}).
const buildStepMessage = (step: BotStep, contact: ContactPayload): string => {
  const base = formatBody(step.message || "", contact as any);
  const options = step.options || [];

  if (options.length === 0) return base;

  const menu = options
    .map((opt, idx) => `*${idx + 1}* - ${opt.label}`)
    .join("\n");

  return `${base}\n\n${menu}`;
};

// Envia ao cliente a mensagem formatada de um step, usando o provider
// de WhatsApp configurado (wwebjs ou whaileys). Falhas são logadas
// mas não interrompem o fluxo — a próxima mensagem do cliente tentará
// avançar o step atual normalmente.
const sendStep = async (
  whatsappId: number,
  contactNumber: string,
  step: BotStep,
  contact: ContactPayload
): Promise<void> => {
  const body = buildStepMessage(step, contact);
  try {
    await whatsappProvider.sendMessage(
      whatsappId,
      `${contactNumber}@c.us`,
      body
    );
  } catch (err) {
    Sentry.captureException(err);
    logger.error({ info: "Error sending bot step message", err, stepId: step.id });
  }
};

// Interpreta a mensagem do cliente como uma escolha dentre as opções
// do step atual. Aceita duas formas:
//   1) Número da opção (1-indexed) — ex.: "2"
//   2) Texto igual ao label da opção (case-insensitive)
// Retorna null se nenhuma bater (o chamador trata como tentativa inválida).
const parseUserChoice = (
  body: string,
  options: StepOption[]
): StepOption | null => {
  if (!body || options.length === 0) return null;

  const trimmed = body.trim();

  const asNumber = Number(trimmed);
  if (Number.isInteger(asNumber) && asNumber >= 1 && asNumber <= options.length) {
    return options[asNumber - 1];
  }

  const byLabel = options.find(
    opt => opt.label.trim().toLowerCase() === trimmed.toLowerCase()
  );

  return byLabel || null;
};

// Busca um step pelo ID dentro dos steps carregados do fluxo.
const findStep = (flow: BotFlow, stepId: number): BotStep | undefined =>
  flow.steps.find(s => s.id === stepId);

// Retorna o primeiro step do fluxo (menor stepOrder). Usado ao iniciar
// o fluxo para um ticket recém-atribuído à fila.
const getFirstStep = (flow: BotFlow): BotStep | undefined =>
  [...flow.steps].sort((a, b) => a.stepOrder - b.stepOrder)[0];

// Limpa o estado de bot do ticket — usado quando o fluxo termina
// (sucesso, cancelamento por tentativas inválidas ou step órfão).
// Depois disso, o ticket fica como `pending` e pode ser assumido por
// um atendente humano normalmente.
const clearBotState = async (ticket: Ticket): Promise<void> => {
  await ticket.update({
    botFlowId: null,
    botStepId: null,
    botInvalidAttempts: 0
  });
};

// Entry point público do service.
// Pré-condições esperadas pelo chamador (handleMessage):
//   - Ticket já carregado com queueId presente.
//   - Mensagem é do cliente (não fromMe) e não veio de grupo.
//   - Ticket ainda não foi assumido por atendente humano (userId null).
const ExecuteBotFlowService = async (
  ticket: Ticket,
  messageBody: string,
  contact: ContactPayload
): Promise<void> => {
  // Guarda redundante (defesa em profundidade): se algum chamador
  // passar um ticket já atribuído a humano ou sem fila, não faz nada.
  if (!ticket.queueId || ticket.userId) return;

  // Busca o fluxo ativo da fila atual. Se não existir ou estiver vazio,
  // não há automação e o ticket fica `pending` para o humano.
  const flow = await BotFlow.findOne({
    where: { queueId: ticket.queueId, enabled: true },
    include: [{ model: BotStep, as: "steps" }]
  });

  if (!flow || !flow.steps || flow.steps.length === 0) return;

  // Caso 1: primeira mensagem após atribuição de fila — inicia o fluxo.
  if (!ticket.botStepId) {
    const firstStep = getFirstStep(flow);
    if (!firstStep) return;

    await ticket.update({
      botFlowId: flow.id,
      botStepId: firstStep.id,
      botInvalidAttempts: 0
    });

    await sendStep(ticket.whatsappId, contact.number, firstStep, contact);
    return;
  }

  // Caso 2: fluxo em andamento — processa a resposta do cliente.
  const currentStep = findStep(flow, ticket.botStepId);

  // Step salvo no ticket não existe mais (pode ter sido deletado numa
  // edição do fluxo). Reseta estado e libera pro humano.
  if (!currentStep) {
    await clearBotState(ticket);
    return;
  }

  const options = currentStep.options || [];

  // Step sem opções = fim natural do fluxo (última pergunta, sem menu).
  if (options.length === 0) {
    await clearBotState(ticket);
    return;
  }

  const chosen = parseUserChoice(messageBody, options);

  // Resposta não bateu em nenhuma opção: incrementa contador e tenta
  // novamente (reenvia o menu). Após MAX_INVALID_ATTEMPTS, desiste.
  if (!chosen) {
    const attempts = (ticket.botInvalidAttempts || 0) + 1;

    if (attempts >= MAX_INVALID_ATTEMPTS) {
      await clearBotState(ticket);
      return;
    }

    await ticket.update({ botInvalidAttempts: attempts });
    await sendStep(ticket.whatsappId, contact.number, currentStep, contact);
    return;
  }

  // Opção com queueId = transferência de fila. Limpa estado e, se a
  // nova fila tiver fluxo próprio, já dispara o primeiro step dele.
  if (chosen.queueId && chosen.queueId !== ticket.queueId) {
    await ticket.update({
      queueId: chosen.queueId,
      botFlowId: null,
      botStepId: null,
      botInvalidAttempts: 0
    });

    const nextFlow = await BotFlow.findOne({
      where: { queueId: chosen.queueId, enabled: true },
      include: [{ model: BotStep, as: "steps" }]
    });

    if (nextFlow) {
      const firstStep = getFirstStep(nextFlow);
      if (firstStep) {
        await ticket.update({
          botFlowId: nextFlow.id,
          botStepId: firstStep.id
        });
        await sendStep(ticket.whatsappId, contact.number, firstStep, contact);
      }
    }
    return;
  }

  // Opção com nextStepId = avança para o próximo step do mesmo fluxo.
  if (chosen.nextStepId) {
    const nextStep = findStep(flow, chosen.nextStepId);
    // Referência quebrada (step deletado): encerra o fluxo.
    if (!nextStep) {
      await clearBotState(ticket);
      return;
    }

    await ticket.update({
      botStepId: nextStep.id,
      botInvalidAttempts: 0
    });

    await sendStep(ticket.whatsappId, contact.number, nextStep, contact);
    return;
  }

  // Opção sem nextStepId e sem queueId = fim do fluxo.
  await clearBotState(ticket);
};

export default ExecuteBotFlowService;

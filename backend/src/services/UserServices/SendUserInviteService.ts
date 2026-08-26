import Whatsapp from "../../models/Whatsapp";
import { whatsappProvider } from "../../providers/WhatsApp/whatsappProvider";
import normalizePhone from "../../helpers/NormalizePhone";

interface Request {
  phone: string;
  name: string;
  resetLink: string;
}

// Número mínimo de dias de uso desde a primeira conexão antes de liberar
// envio automático de mensagem de primeiro contato por essa sessão. Números
// recém-conectados via Baileys/whaileys que já saem enviando mensagens
// automáticas com link, sem histórico de conversa com o destinatário, são o
// padrão de uso que mais aciona o antispam do WhatsApp e pode levar a
// banimento permanente logo nos primeiros dias.
const MIN_CONNECTION_AGE_DAYS = Number(
  process.env.WHATSAPP_INVITE_MIN_CONNECTION_AGE_DAYS || 7
);

// Envia o link de definição de senha por WhatsApp para o número do novo
// usuário, usando a primeira conexão CONNECTED disponível (preferindo a
// conexão marcada como padrão).
const SendUserInviteService = async ({
  phone,
  name,
  resetLink
}: Request): Promise<void> => {
  const whatsapp =
    (await Whatsapp.findOne({ where: { status: "CONNECTED", isDefault: true } })) ||
    (await Whatsapp.findOne({ where: { status: "CONNECTED" } }));

  if (!whatsapp) {
    throw new Error(
      "Nenhuma conexão WhatsApp ativa para enviar o convite de acesso."
    );
  }

  const connectionAgeMs = whatsapp.firstConnectedAt
    ? Date.now() - new Date(whatsapp.firstConnectedAt).getTime()
    : 0;
  const connectionAgeDays = connectionAgeMs / (1000 * 60 * 60 * 24);

  if (connectionAgeDays < MIN_CONNECTION_AGE_DAYS) {
    throw new Error(
      "Conexão WhatsApp muito recente para envio automático (menos de " +
        `${MIN_CONNECTION_AGE_DAYS} dias desde a primeira conexão). Isso é ` +
        "bloqueado de propósito: números novos que já disparam mensagens " +
        "automáticas de primeiro contato correm alto risco de banimento. " +
        "Envie o link de acesso manualmente por enquanto."
    );
  }

  const body =
    `Olá, ${name}! Você foi cadastrado(a) no painel de atendimento. 🎉\n\n` +
    `Para definir sua senha de acesso, abra o link abaixo:\n${resetLink}\n\n` +
    `O link expira em 24 horas.`;

  // Valida que o número existe no WhatsApp antes de enviar — sem isso, um
  // número inválido (ex.: sem DDI) faz o provider "aceitar" o envio e
  // reportar sucesso mesmo que a mensagem nunca chegue a ninguém.
  let jid: string;
  try {
    jid = await whatsappProvider.checkNumber(whatsapp.id, normalizePhone(phone));
  } catch {
    throw new Error(
      "O número informado não foi encontrado no WhatsApp. Confira o DDD e o DDI (ex.: 55)."
    );
  }

  await whatsappProvider.sendMessage(whatsapp.id, jid, body, {
    simulateTyping: true
  });
};

export default SendUserInviteService;

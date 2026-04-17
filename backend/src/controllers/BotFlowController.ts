import { Request, Response } from "express";
import { getIO } from "../libs/socket";
import AppError from "../errors/AppError";
import BotFlow from "../models/BotFlow";
import BotStep from "../models/BotStep";
import Queue from "../models/Queue";

// --------------------------------------------------------------------
// BotFlowController
// --------------------------------------------------------------------
// CRUD dos fluxos de bot. Um BotFlow é composto por uma lista ordenada
// de BotSteps; cada step tem uma mensagem e uma lista de `options`. Uma
// option pode levar a outro step do mesmo fluxo (nextStepId ou
// nextStepIndex) OU transferir o ticket para outra fila (queueId).
//
// Observação importante:
// - No `update`, os steps antigos são destruídos e recriados (os IDs
//   mudam). Por isso o frontend envia `nextStepIndex` (posição 0..N-1
//   do step alvo dentro da nova lista) e este controller resolve para
//   o `nextStepId` real depois que os novos steps forem criados.
// - Para compatibilidade, se o payload já vier com `nextStepId` válido
//   dos novos steps, ele é mantido.
// --------------------------------------------------------------------

type OptionInput = {
  label: string;
  nextStepId?: number;
  nextStepIndex?: number;
  queueId?: number;
};

type StepInput = {
  message: string;
  options?: OptionInput[];
};

// Após criar os steps em ordem, converte options com `nextStepIndex`
// para `nextStepId` real e persiste.
const resolveStepOptions = async (
  createdSteps: BotStep[],
  stepsInput: StepInput[]
): Promise<void> => {
  for (let i = 0; i < createdSteps.length; i += 1) {
    const step = createdSteps[i];
    const inputOptions = stepsInput[i]?.options || [];

    const resolved = inputOptions.map(opt => {
      const out: { label: string; nextStepId?: number; queueId?: number } = {
        label: opt.label
      };

      if (typeof opt.queueId === "number") {
        out.queueId = opt.queueId;
        return out;
      }

      if (
        typeof opt.nextStepIndex === "number" &&
        opt.nextStepIndex >= 0 &&
        opt.nextStepIndex < createdSteps.length
      ) {
        out.nextStepId = createdSteps[opt.nextStepIndex].id;
        return out;
      }

      if (typeof opt.nextStepId === "number") {
        // Caso o frontend tenha mandado nextStepId já válido para steps
        // recém-criados (edge case), preserva.
        out.nextStepId = opt.nextStepId;
      }

      return out;
    });

    step.options = resolved;
    await step.save();
  }
};

// Cria steps na ordem do array, sem options (options serão resolvidas
// num segundo passo porque podem referenciar outros steps pelo índice).
const createStepsInOrder = async (
  botFlowId: number,
  stepsInput: StepInput[]
): Promise<BotStep[]> => {
  const created: BotStep[] = [];
  for (let i = 0; i < stepsInput.length; i += 1) {
    const step = await BotStep.create({
      botFlowId,
      stepOrder: i,
      message: stepsInput[i].message,
      options: []
    } as any);
    created.push(step);
  }
  return created;
};

// Lista todos os fluxos com seus steps (ordenados) e a fila vinculada.
export const index = async (req: Request, res: Response): Promise<Response> => {
  const flows = await BotFlow.findAll({
    include: [
      { model: BotStep, as: "steps", order: [["stepOrder", "ASC"]] },
      { model: Queue, as: "queue", attributes: ["id", "name", "color"] }
    ],
    order: [["name", "ASC"]]
  });

  const result = flows.map(f => ({
    id: f.id,
    name: f.name,
    queueId: f.queueId,
    queueName: f.queue?.name || "",
    enabled: f.enabled,
    steps: f.steps
      .sort((a, b) => a.stepOrder - b.stepOrder)
      .map(s => ({
        id: s.id,
        message: s.message,
        options: s.options
      }))
  }));

  return res.json(result);
};

// Cria um novo fluxo com seus steps. Valida nome obrigatório e aceita
// options com `nextStepIndex` para apontar para steps do mesmo payload.
export const store = async (req: Request, res: Response): Promise<Response> => {
  const { name, queueId, enabled, steps } = req.body as {
    name: string;
    queueId: number;
    enabled: boolean;
    steps?: StepInput[];
  };

  if (!name) {
    throw new AppError("ERR_BOTFLOW_NAME_REQUIRED", 400);
  }

  const flow = await BotFlow.create({ name, queueId, enabled } as any);

  if (Array.isArray(steps) && steps.length > 0) {
    const createdSteps = await createStepsInOrder(flow.id, steps);
    await resolveStepOptions(createdSteps, steps);
  }

  const created = await BotFlow.findByPk(flow.id, {
    include: [
      { model: BotStep, as: "steps" },
      { model: Queue, as: "queue", attributes: ["id", "name"] }
    ]
  });

  const io = getIO();
  io.emit("botFlow", { action: "create", botFlow: created });

  return res.status(200).json(created);
};

// Retorna um fluxo específico com steps ordenados.
export const show = async (req: Request, res: Response): Promise<Response> => {
  const { flowId } = req.params;

  const flow = await BotFlow.findByPk(flowId, {
    include: [
      { model: BotStep, as: "steps", order: [["stepOrder", "ASC"]] },
      { model: Queue, as: "queue", attributes: ["id", "name"] }
    ]
  });

  if (!flow) {
    throw new AppError("ERR_BOTFLOW_NOT_FOUND", 404);
  }

  return res.json(flow);
};

// Atualiza metadados do fluxo e, se `steps` for enviado, substitui
// todos os steps (destroy + create). Por isso o frontend deve enviar
// `nextStepIndex` em vez de `nextStepId` para referências internas.
export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { flowId } = req.params;
  const { name, queueId, enabled, steps } = req.body as {
    name: string;
    queueId: number;
    enabled: boolean;
    steps?: StepInput[];
  };

  const flow = await BotFlow.findByPk(flowId);
  if (!flow) {
    throw new AppError("ERR_BOTFLOW_NOT_FOUND", 404);
  }

  await flow.update({ name, queueId, enabled });

  if (Array.isArray(steps)) {
    await BotStep.destroy({ where: { botFlowId: flow.id } });
    const createdSteps = await createStepsInOrder(flow.id, steps);
    await resolveStepOptions(createdSteps, steps);
  }

  const updated = await BotFlow.findByPk(flow.id, {
    include: [
      { model: BotStep, as: "steps" },
      { model: Queue, as: "queue", attributes: ["id", "name"] }
    ]
  });

  const io = getIO();
  io.emit("botFlow", { action: "update", botFlow: updated });

  return res.json(updated);
};

// Remove o fluxo; steps vinculados são deletados por cascata (onDelete
// CASCADE na migration de bot-steps).
export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { flowId } = req.params;

  const flow = await BotFlow.findByPk(flowId);
  if (!flow) {
    throw new AppError("ERR_BOTFLOW_NOT_FOUND", 404);
  }

  await flow.destroy();

  const io = getIO();
  io.emit("botFlow", { action: "delete", flowId: +flowId });

  return res.status(200).json({ message: "Bot flow deleted" });
};

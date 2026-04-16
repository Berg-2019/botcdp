import { Request, Response } from "express";
import { getIO } from "../libs/socket";
import AppError from "../errors/AppError";
import BotFlow from "../models/BotFlow";
import BotStep from "../models/BotStep";
import Queue from "../models/Queue";

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
    steps: f.steps.map(s => ({
      id: s.id,
      message: s.message,
      options: s.options
    }))
  }));

  return res.json(result);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { name, queueId, enabled, steps } = req.body;

  if (!name) {
    throw new AppError("ERR_BOTFLOW_NAME_REQUIRED", 400);
  }

  const flow = await BotFlow.create({ name, queueId, enabled });

  if (steps && Array.isArray(steps)) {
    for (let i = 0; i < steps.length; i++) {
      await BotStep.create({
        botFlowId: flow.id,
        stepOrder: i,
        message: steps[i].message,
        options: steps[i].options || []
      });
    }
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

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { flowId } = req.params;
  const { name, queueId, enabled, steps } = req.body;

  const flow = await BotFlow.findByPk(flowId);
  if (!flow) {
    throw new AppError("ERR_BOTFLOW_NOT_FOUND", 404);
  }

  await flow.update({ name, queueId, enabled });

  if (steps && Array.isArray(steps)) {
    await BotStep.destroy({ where: { botFlowId: flow.id } });
    for (let i = 0; i < steps.length; i++) {
      await BotStep.create({
        botFlowId: flow.id,
        stepOrder: i,
        message: steps[i].message,
        options: steps[i].options || []
      });
    }
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

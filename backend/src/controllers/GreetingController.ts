import { Request, Response } from "express";
import Queue from "../models/Queue";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const queues = await Queue.findAll({
    attributes: ["id", "name", "greetingMessage"],
    order: [["name", "ASC"]]
  });

  const greetings = queues.map(q => ({
    id: q.id,
    queueId: q.id,
    queueName: q.name,
    message: q.greetingMessage || "",
    enabled: !!q.greetingMessage
  }));

  return res.json(greetings);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { queueId } = req.params;
  const { message, enabled } = req.body;

  const queue = await Queue.findByPk(queueId);
  if (!queue) {
    return res.status(404).json({ error: "Queue not found" });
  }

  await queue.update({
    greetingMessage: enabled ? message : ""
  });

  return res.json({
    id: queue.id,
    queueId: queue.id,
    queueName: queue.name,
    message: queue.greetingMessage || "",
    enabled: !!queue.greetingMessage
  });
};

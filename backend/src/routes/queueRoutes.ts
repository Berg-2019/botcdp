import { Router } from "express";
import isAuth from "../middleware/isAuth";

import * as QueueController from "../controllers/QueueController";
import ListAvailableQueuesService from "../services/QueueService/ListAvailableQueuesService";

const queueRoutes = Router();

queueRoutes.get("/queue", isAuth, QueueController.index);

queueRoutes.get("/queue/available", isAuth, async (req, res) => {
  const queues = await ListAvailableQueuesService();
  return res.json(queues);
});

queueRoutes.post("/queue", isAuth, QueueController.store);

queueRoutes.get("/queue/:queueId", isAuth, QueueController.show);

queueRoutes.put("/queue/:queueId", isAuth, QueueController.update);

queueRoutes.delete("/queue/:queueId", isAuth, QueueController.remove);

export default queueRoutes;

import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as BotFlowController from "../controllers/BotFlowController";

const botFlowRoutes = Router();

botFlowRoutes.get("/bot-flows", isAuth, BotFlowController.index);
botFlowRoutes.post("/bot-flows", isAuth, BotFlowController.store);
botFlowRoutes.get("/bot-flows/:flowId", isAuth, BotFlowController.show);
botFlowRoutes.put("/bot-flows/:flowId", isAuth, BotFlowController.update);
botFlowRoutes.delete("/bot-flows/:flowId", isAuth, BotFlowController.remove);

export default botFlowRoutes;

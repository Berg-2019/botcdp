import { Router } from "express";
import isAuth from "../middleware/isAuth";
import isAdmin from "../middleware/isAdmin";
import * as BotFlowController from "../controllers/BotFlowController";

const botFlowRoutes = Router();

botFlowRoutes.get("/bot-flows", isAuth, BotFlowController.index);
botFlowRoutes.post("/bot-flows", isAuth, isAdmin, BotFlowController.store);
botFlowRoutes.get("/bot-flows/:flowId", isAuth, BotFlowController.show);
botFlowRoutes.put("/bot-flows/:flowId", isAuth, isAdmin, BotFlowController.update);
botFlowRoutes.delete("/bot-flows/:flowId", isAuth, isAdmin, BotFlowController.remove);

export default botFlowRoutes;

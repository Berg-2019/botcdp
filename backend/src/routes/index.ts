import { Router } from "express";

import userRoutes from "./userRoutes";
import authRoutes from "./authRoutes";
import settingRoutes from "./settingRoutes";
import contactRoutes from "./contactRoutes";
import ticketRoutes from "./ticketRoutes";
import whatsappRoutes from "./whatsappRoutes";
import messageRoutes from "./messageRoutes";
import whatsappSessionRoutes from "./whatsappSessionRoutes";
import queueRoutes from "./queueRoutes";
import apiRoutes from "./apiRoutes";
import dashboardRoutes from "./dashboardRoutes";
import botFlowRoutes from "./botFlowRoutes";
import greetingRoutes from "./greetingRoutes";
import generalSettingRoutes from "./generalSettingRoutes";

const routes = Router();

routes.use(userRoutes);
routes.use("/auth", authRoutes);
routes.use(generalSettingRoutes);
routes.use(settingRoutes);
routes.use(contactRoutes);
routes.use(ticketRoutes);
routes.use(whatsappRoutes);
routes.use(messageRoutes);
routes.use(whatsappSessionRoutes);
routes.use(queueRoutes);
routes.use(dashboardRoutes);
routes.use(botFlowRoutes);
routes.use(greetingRoutes);
routes.use("/external", apiRoutes);

export default routes;

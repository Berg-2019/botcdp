import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as DashboardController from "../controllers/DashboardController";

const dashboardRoutes = Router();

dashboardRoutes.get("/dashboard/stats", isAuth, DashboardController.stats);
dashboardRoutes.get("/dashboard/tickets-by-queue", isAuth, DashboardController.ticketsByQueue);
dashboardRoutes.get("/dashboard/agent-performance", isAuth, DashboardController.agentPerformance);
dashboardRoutes.get("/dashboard/volume", isAuth, DashboardController.volumeByPeriod);
dashboardRoutes.get("/dashboard/sla", isAuth, DashboardController.slaByQueue);

export default dashboardRoutes;

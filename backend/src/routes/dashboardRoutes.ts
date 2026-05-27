import { Router } from "express";
import isAuth from "../middleware/isAuth";
import isAdmin from "../middleware/isAdmin";
import * as DashboardController from "../controllers/DashboardController";

const dashboardRoutes = Router();

dashboardRoutes.get("/dashboard/stats", isAuth, isAdmin, DashboardController.stats);
dashboardRoutes.get("/dashboard/tickets-by-queue", isAuth, isAdmin, DashboardController.ticketsByQueue);
dashboardRoutes.get("/dashboard/agent-performance", isAuth, isAdmin, DashboardController.agentPerformance);
dashboardRoutes.get("/dashboard/volume", isAuth, isAdmin, DashboardController.volumeByPeriod);
dashboardRoutes.get("/dashboard/sla", isAuth, isAdmin, DashboardController.slaByQueue);

export default dashboardRoutes;

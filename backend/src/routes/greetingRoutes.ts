import { Router } from "express";
import isAuth from "../middleware/isAuth";
import isAdmin from "../middleware/isAdmin";
import * as GreetingController from "../controllers/GreetingController";

const greetingRoutes = Router();

greetingRoutes.get("/greetings", isAuth, GreetingController.index);
greetingRoutes.put("/greetings/:queueId", isAuth, isAdmin, GreetingController.update);

export default greetingRoutes;

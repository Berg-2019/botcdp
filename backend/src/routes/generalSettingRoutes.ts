import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as GeneralSettingController from "../controllers/GeneralSettingController";

const generalSettingRoutes = Router();

generalSettingRoutes.get("/settings/general", isAuth, GeneralSettingController.index);
generalSettingRoutes.put("/settings/general", isAuth, GeneralSettingController.update);

export default generalSettingRoutes;

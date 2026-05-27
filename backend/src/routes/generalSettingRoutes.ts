import { Router } from "express";
import isAuth from "../middleware/isAuth";
import isAdmin from "../middleware/isAdmin";
import * as GeneralSettingController from "../controllers/GeneralSettingController";

const generalSettingRoutes = Router();

generalSettingRoutes.get("/settings/general", isAuth, isAdmin, GeneralSettingController.index);
generalSettingRoutes.put("/settings/general", isAuth, isAdmin, GeneralSettingController.update);

export default generalSettingRoutes;

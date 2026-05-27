import { Router } from "express";
import isAuth from "../middleware/isAuth";
import isAdmin from "../middleware/isAdmin";

import * as SettingController from "../controllers/SettingController";

const settingRoutes = Router();

settingRoutes.get("/settings", isAuth, isAdmin, SettingController.index);

settingRoutes.put("/settings/:settingKey", isAuth, isAdmin, SettingController.update);

export default settingRoutes;

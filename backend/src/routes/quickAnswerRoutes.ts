import { Router } from "express";
import isAuth from "../middleware/isAuth";
import isAdmin from "../middleware/isAdmin";

import * as QuickAnswerController from "../controllers/QuickAnswerController";

const quickAnswerRoutes = Router();

quickAnswerRoutes.get("/quickAnswers", isAuth, QuickAnswerController.index);

quickAnswerRoutes.post(
  "/quickAnswers",
  isAuth,
  isAdmin,
  QuickAnswerController.store
);

quickAnswerRoutes.put(
  "/quickAnswers/:quickAnswerId",
  isAuth,
  isAdmin,
  QuickAnswerController.update
);

quickAnswerRoutes.delete(
  "/quickAnswers/:quickAnswerId",
  isAuth,
  isAdmin,
  QuickAnswerController.remove
);

export default quickAnswerRoutes;

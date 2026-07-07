import { Router } from "express";
import * as SessionController from "../controllers/SessionController";
import * as UserController from "../controllers/UserController";
import isAuth from "../middleware/isAuth";
import isAdmin from "../middleware/isAdmin";
import { loginLimiter, authLimiter } from "../middleware/rateLimiter";

const authRoutes = Router();

authRoutes.post("/signup", isAuth, isAdmin, authLimiter, UserController.store);

authRoutes.post("/login", loginLimiter, SessionController.store);

authRoutes.post("/refresh_token", authLimiter, SessionController.update);

authRoutes.delete("/logout", isAuth, SessionController.remove);

authRoutes.post("/set-password", loginLimiter, SessionController.setPassword);

authRoutes.put(
  "/change-password",
  isAuth,
  authLimiter,
  SessionController.changePassword
);

export default authRoutes;

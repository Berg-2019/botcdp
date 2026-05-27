import { Request, Response, NextFunction } from "express";

import AppError from "../errors/AppError";
import ListSettingByValueService from "../services/SettingServices/ListSettingByValueService";
import { logger } from "../utils/logger";

const isAuthApi = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    throw new AppError("ERR_SESSION_EXPIRED", 401);
  }

  const [, token] = authHeader.split(" ");

  try {
    const getToken = await ListSettingByValueService(token);
    if (!getToken) {
      throw new AppError("ERR_SESSION_EXPIRED", 401);
    }

    if (getToken.value !== token) {
      throw new AppError("ERR_SESSION_EXPIRED", 401);
    }
  } catch (err) {
    if (err instanceof AppError) throw err;
    logger.error("API auth error");
    throw new AppError("ERR_SESSION_EXPIRED", 403);
  }

  return next();
};

export default isAuthApi;

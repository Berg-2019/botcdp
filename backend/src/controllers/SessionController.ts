import { Request, Response } from "express";
import AppError from "../errors/AppError";

import AuthUserService from "../services/UserServices/AuthUserService";
import { SendRefreshToken } from "../helpers/SendRefreshToken";
import { SendAccessToken, clearAccessToken } from "../helpers/SendAccessToken";
import { RefreshTokenService } from "../services/AuthServices/RefreshTokenService";
import SetPasswordService from "../services/AuthServices/SetPasswordService";
import ChangePasswordService from "../services/AuthServices/ChangePasswordService";
import User from "../models/User";

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { email, phone, password } = req.body;

  const { token, serializedUser, refreshToken } = await AuthUserService({
    email,
    phone,
    password
  });

  SendRefreshToken(res, refreshToken);
  SendAccessToken(res, token);

  return res.status(200).json({
    user: serializedUser
  });
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const token: string = req.cookies.jrt;

  if (!token) {
    throw new AppError("ERR_SESSION_EXPIRED", 401);
  }

  const { user, newToken, refreshToken } = await RefreshTokenService(
    res,
    token
  );

  SendRefreshToken(res, refreshToken);
  SendAccessToken(res, newToken);

  return res.json({ user });
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const userId = req.user.id;

  const user = await User.findByPk(userId);
  if (user) {
    await user.increment("tokenVersion");
  }

  res.clearCookie("jrt");
  clearAccessToken(res);

  return res.send();
};

export const setPassword = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { token, password } = req.body;

  const result = await SetPasswordService({ token, password });

  return res.status(200).json(result);
};

export const changePassword = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { currentPassword, newPassword } = req.body;

  const result = await ChangePasswordService({
    userId: req.user.id,
    currentPassword,
    newPassword
  });

  res.clearCookie("jrt");
  clearAccessToken(res);

  return res.status(200).json(result);
};

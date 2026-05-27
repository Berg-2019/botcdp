import { Request, Response } from "express";
import { getIO } from "../libs/socket";

import AppError from "../errors/AppError";

import CreateUserService from "../services/UserServices/CreateUserService";
import ListUsersService from "../services/UserServices/ListUsersService";
import UpdateUserService from "../services/UserServices/UpdateUserService";
import ShowUserService from "../services/UserServices/ShowUserService";
import DeleteUserService from "../services/UserServices/DeleteUserService";

type IndexQuery = {
  searchParam: string;
  pageNumber: string;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { searchParam, pageNumber } = req.query as IndexQuery;

  const { users, count, hasMore } = await ListUsersService({
    searchParam,
    pageNumber
  });

  return res.json({ users, count, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { email, password, name, profile, queueIds, whatsappId } = req.body;

  const isAdminCreation = req.user
    && ["admin", "developer"].includes(req.user.profile);

  const user = await CreateUserService({
    email,
    password,
    name,
    profile: isAdminCreation ? profile : "agent",
    queueIds,
    whatsappId,
    isAdminCreation
  });

  const io = getIO();
  io.emit("user", {
    action: "create",
    user
  });

  if (isAdminCreation && user.resetToken) {
    return res.status(200).json({
      user,
      resetLink: `/set-password?token=${user.resetToken}`
    });
  }

  return res.status(200).json(user);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { userId } = req.params;

  const user = await ShowUserService(userId);

  return res.status(200).json(user);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  // Permite que admin e developer atualizem usuários
  if (!["admin", "developer"].includes(req.user.profile)) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const { userId } = req.params;
  const userData = req.body;

  const user = await UpdateUserService({ userData, userId });

  const io = getIO();
  io.emit("user", {
    action: "update",
    user
  });

  return res.status(200).json(user);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { userId } = req.params;

  // Permite que admin e developer deletem usuários
  if (!["admin", "developer"].includes(req.user.profile)) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  await DeleteUserService(userId);

  const io = getIO();
  io.emit("user", {
    action: "delete",
    userId
  });

  return res.status(200).json({ message: "User deleted" });
};

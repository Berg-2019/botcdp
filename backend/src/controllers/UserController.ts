import { Request, Response } from "express";
import { getIO } from "../libs/socket";

import CheckSettingsHelper from "../helpers/CheckSettings";
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

  // Verifica permissões: 
  // - Se for signup (/signup), verifica se criação de usuários está habilitada
  // - Se for criação por admin/developer (/users), verifica se o usuário logado é admin ou developer
  if (
    req.url === "/signup" &&
    (await CheckSettingsHelper("userCreation")) === "disabled"
  ) {
    throw new AppError("ERR_USER_CREATION_DISABLED", 403);
  } else if (req.url !== "/signup" && !["admin", "developer"].includes(req.user.profile)) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  // Determina se é criação por admin/developer
  // Admin/Developer cria sem fornecer senha - será gerada automaticamente
  // O admin/developer depois compartilha um link para o usuário definir sua própria senha
  const isAdminCreation = req.url === "/users" && ["admin", "developer"].includes(req.user.profile);

  const user = await CreateUserService({
    email,
    password,
    name,
    profile: req.url === "/signup" ? "agent" : profile,
    queueIds,
    whatsappId,
    isAdminCreation
  });

  // Emite evento via Socket.IO para atualizar outros clientes em tempo real
  const io = getIO();
  io.emit("user", {
    action: "create",
    user
  });

  // Se foi criação por admin, prepara a resposta com link de reset
  if (isAdminCreation && user.resetToken) {
    // Monta o link de reset de senha para compartilhar com o novo usuário
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const resetLink = `${frontendUrl}/set-password?token=${user.resetToken}`;
    
    return res.status(200).json({
      user,
      resetToken: user.resetToken,
      resetLink
    });
  }

  // Para criação via signup, retorna apenas os dados do usuário
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

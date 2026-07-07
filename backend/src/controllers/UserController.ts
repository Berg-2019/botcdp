import { Request, Response } from "express";
import { getIO } from "../libs/socket";

import AppError from "../errors/AppError";

import CreateUserService from "../services/UserServices/CreateUserService";
import ListUsersService from "../services/UserServices/ListUsersService";
import UpdateUserService from "../services/UserServices/UpdateUserService";
import ShowUserService from "../services/UserServices/ShowUserService";
import DeleteUserService from "../services/UserServices/DeleteUserService";
import SendUserInviteService from "../services/UserServices/SendUserInviteService";
import Whatsapp from "../models/Whatsapp";
import { whatsappProvider } from "../providers/WhatsApp/whatsappProvider";
import normalizePhone from "../helpers/NormalizePhone";

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
  const { email, phone, password, name, profile, queueIds, whatsappId } = req.body;

  const isAdminCreation = req.user
    && ["admin", "developer"].includes(req.user.profile);

  // Valida a conexão e o número de WhatsApp ANTES de criar o usuário: se o
  // convite não puder ser entregue, nada é criado e o admin volta pro
  // formulário pra corrigir o número, em vez de ficar com um usuário criado
  // sem conseguir receber o link de acesso.
  if (isAdminCreation && phone) {
    const activeWhatsapp =
      (await Whatsapp.findOne({ where: { status: "CONNECTED", isDefault: true } })) ||
      (await Whatsapp.findOne({ where: { status: "CONNECTED" } }));

    if (!activeWhatsapp) {
      throw new AppError(
        "Nenhuma conexão WhatsApp ativa para enviar o convite de acesso."
      );
    }

    try {
      await whatsappProvider.checkNumber(activeWhatsapp.id, normalizePhone(phone));
    } catch {
      throw new AppError(
        "O número informado não foi encontrado no WhatsApp. Confira o DDD e o DDI (ex.: 55)."
      );
    }
  }

  const user = await CreateUserService({
    email,
    phone,
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
    const relativeLink = `/set-password?token=${user.resetToken}`;
    const resetLink = `${process.env.FRONTEND_URL || ""}${relativeLink}`;

    let whatsappSent = false;
    let whatsappError: string | undefined;

    if (phone) {
      try {
        await SendUserInviteService({ phone, name: user.name, resetLink });
        whatsappSent = true;
      } catch (err) {
        whatsappError =
          err instanceof Error || err instanceof AppError
            ? err.message
            : "Falha ao enviar convite via WhatsApp";
      }
    }

    return res.status(200).json({
      user,
      resetLink: relativeLink,
      whatsappSent,
      ...(whatsappError ? { whatsappError } : {})
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

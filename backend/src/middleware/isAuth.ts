import { verify } from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

import AppError from "../errors/AppError";
import authConfig from "../config/auth";

interface TokenPayload {
  id: string;
  username: string;
  profile: string;
  mustChangePassword?: boolean;
  iat: number;
  exp: number;
}

// Rotas liberadas mesmo quando a conta está com troca de senha obrigatória
// pendente — precisam bastar para o usuário trocar a senha e sair, nada mais.
const ALLOWED_WHEN_MUST_CHANGE_PASSWORD: Array<{ method: string; path: string }> = [
  { method: "PUT", path: "/api/auth/change-password" },
  { method: "DELETE", path: "/api/auth/logout" }
];

const isAuth = (req: Request, res: Response, next: NextFunction): void => {
  // O cookie httpOnly "access_token" é o método principal (frontend web);
  // o header Authorization fica como alternativa para outros clientes.
  const cookieToken: string | undefined = req.cookies?.access_token;
  const authHeader = req.headers.authorization;
  const headerToken = authHeader ? authHeader.split(" ")[1] : undefined;

  const token = cookieToken || headerToken;

  if (!token) {
    throw new AppError("ERR_SESSION_EXPIRED", 401);
  }

  let decoded: TokenPayload;
  try {
    decoded = verify(token, authConfig.secret as string, {
      algorithms: ["HS256"]
    }) as TokenPayload;
  } catch (err) {
    throw new AppError(
      "ERR_SESSION_EXPIRED",
      403
    );
  }

  const { id, profile, mustChangePassword } = decoded;

  req.user = {
    id,
    profile
  };

  if (mustChangePassword) {
    const isAllowed = ALLOWED_WHEN_MUST_CHANGE_PASSWORD.some(
      route => route.method === req.method && req.originalUrl.startsWith(route.path)
    );

    if (!isAllowed) {
      throw new AppError("ERR_MUST_CHANGE_PASSWORD", 403);
    }
  }

  return next();
};

export default isAuth;

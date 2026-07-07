import { sign } from "jsonwebtoken";
import authConfig from "../config/auth";
import User from "../models/User";

export const createAccessToken = (user: User): string => {
  const { secret, expiresIn } = authConfig;

  return sign(
    {
      username: user.name,
      profile: user.profile,
      id: user.id,
      mustChangePassword: user.mustChangePassword
    },
    secret as string,
    {
      expiresIn,
      algorithm: "HS256"
    }
  );
};

export const createRefreshToken = (user: User): string => {
  const { refreshSecret, refreshExpiresIn } = authConfig;

  return sign({ id: user.id, tokenVersion: user.tokenVersion }, refreshSecret as string, {
    expiresIn: refreshExpiresIn,
    algorithm: "HS256"
  });
};

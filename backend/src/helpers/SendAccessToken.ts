import { Response } from "express";

const ACCESS_TOKEN_COOKIE = "access_token";
// Mantenha alinhado a authConfig.expiresIn ("15m") em config/auth.ts.
const ACCESS_TOKEN_MAX_AGE_MS = 15 * 60 * 1000;

export const SendAccessToken = (res: Response, token: string): void => {
  res.cookie(ACCESS_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: ACCESS_TOKEN_MAX_AGE_MS
  });
};

export const clearAccessToken = (res: Response): void => {
  res.clearCookie(ACCESS_TOKEN_COOKIE, { path: "/" });
};

export { ACCESS_TOKEN_COOKIE };

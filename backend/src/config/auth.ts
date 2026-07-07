export default {
  secret: process.env.JWT_SECRET as string,
  expiresIn: "15m" as const,
  refreshSecret: process.env.JWT_REFRESH_SECRET as string,
  refreshExpiresIn: "7d" as const,
  resetSecret: process.env.JWT_RESET_SECRET as string
};

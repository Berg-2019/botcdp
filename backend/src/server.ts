import gracefulShutdown from "http-graceful-shutdown";
import app from "./app";
import { initIO } from "./libs/socket";
import { logger } from "./utils/logger";
import { initRedis } from "./libs/redisStore";
import { StartAllWhatsAppsSessions } from "./services/WbotServices/StartAllWhatsAppsSessions";

const server = app.listen(process.env.PORT, () => {
  logger.info(`Servidor iniciado na porta: ${process.env.PORT}`);
});

initIO(server);
initRedis();
StartAllWhatsAppsSessions();
gracefulShutdown(server);

process.on("uncaughtException", err => {
  logger.error({ info: "Exceção não tratada global", err });
});

process.on("unhandledRejection", err => {
  if (err) logger.error({ info: "Rejeição não tratada global", err });
});

import gracefulShutdown from "http-graceful-shutdown";
import app from "./app";
import { initIO } from "./libs/socket";
import { logger } from "./utils/logger";
import { initRedis } from "./libs/redisStore";
import { StartAllWhatsAppsSessions } from "./services/WbotServices/StartAllWhatsAppsSessions";

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  logger.info(`Servidor iniciado na porta: ${PORT}`);
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

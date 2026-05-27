import { Server as SocketIO } from "socket.io";
import { Server } from "http";
import { verify } from "jsonwebtoken";
import AppError from "../errors/AppError";
import { logger } from "../utils/logger";
import authConfig from "../config/auth";
import Ticket from "../models/Ticket";

interface TokenPayload {
  id: string;
  profile: string;
}

let io: SocketIO;

export const initIO = (httpServer: Server): SocketIO => {
  io = new SocketIO(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL as string
    }
  });

  io.on("connection", socket => {
    const { token } = socket.handshake.query;
    let tokenData: TokenPayload | null = null;
    try {
      tokenData = verify(token as string, authConfig.secret as string) as TokenPayload;
    } catch (error) {
      socket.disconnect();
      return io;
    }

    const userIsAdmin = ["admin", "developer"].includes(tokenData.profile);
    const userId = tokenData.id;

    logger.info("Client Connected");

    socket.on("joinChatBox", async (ticketId: string) => {
      try {
        if (!userIsAdmin) {
          const ticket = await Ticket.findByPk(ticketId);
          if (ticket && ticket.userId && String(ticket.userId) !== userId) {
            logger.warn(`User ${userId} denied access to ticket ${ticketId}`);
            return;
          }
        }
        socket.join(ticketId);
      } catch {
        logger.warn(`Error checking ticket access for user ${userId}`);
      }
    });

    socket.on("joinNotification", () => {
      socket.join(`notification_${userId}`);
    });

    socket.on("joinTickets", (status: string) => {
      socket.join(`${status}_${userId}`);
      if (userIsAdmin) {
        socket.join(`admin_${status}`);
      }
    });

    socket.on("disconnect", () => {
      logger.info("Client disconnected");
    });

    return socket;
  });
  return io;
};

export const getIO = (): SocketIO => {
  if (!io) {
    throw new AppError("Socket IO not initialized");
  }
  return io;
};

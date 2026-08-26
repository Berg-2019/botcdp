import AppError from "../../errors/AppError";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import { whatsappProvider } from "../../providers/WhatsApp";
import { BOT_MESSAGE_DELAY_MS } from "../../providers/WhatsApp/types";

import formatBody from "../../helpers/Mustache";

interface Request {
  body: string;
  ticket: Ticket;
  quotedMsg?: Message;
  // true para envios automáticos disparados pelo sistema (ex.: despedida
  // e pedido de avaliação ao fechar ticket) — aplica o mesmo atraso
  // "digitando..." usado nas respostas do bot. Mensagens digitadas por
  // um atendente humano não devem passar essa flag.
  systemTriggered?: boolean;
}

const SendWhatsAppMessage = async ({
  body,
  ticket,
  quotedMsg,
  systemTriggered
}: Request): Promise<{ id: string; body: string; fromMe: boolean; ack?: number }> => {
  if (!ticket.whatsappId) {
    throw new AppError("ERR_TICKET_NO_WHATSAPP");
  }

  const chatId = `${ticket.contact.number}@${ticket.isGroup ? "g" : "c"}.us`;

  try {
    const sentMessage = await whatsappProvider.sendMessage(
      ticket.whatsappId,
      chatId,
      formatBody(body, ticket.contact),
      {
        quotedMessageId: quotedMsg?.id || undefined,
        quotedMessageFromMe: quotedMsg?.fromMe,
        linkPreview: false,
        ...(systemTriggered ? { botDelayMs: BOT_MESSAGE_DELAY_MS } : {})
      }
    );

    await ticket.update({ lastMessage: body });

    return {
      id: sentMessage.id,
      body: sentMessage.body,
      fromMe: sentMessage.fromMe,
      ack: sentMessage.ack
    };
  } catch (err) {
    throw new AppError("ERR_SENDING_WAPP_MSG");
  }
};

export default SendWhatsAppMessage;

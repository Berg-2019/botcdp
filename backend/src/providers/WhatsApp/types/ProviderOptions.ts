export interface SendMessageOptions {
  quotedMessageId?: string;
  quotedMessageFromMe?: boolean;
  linkPreview?: boolean;
  // Simula "digitando..." com um atraso antes do envio — usado em envios
  // automáticos de primeiro contato (ex.: convite de acesso), onde uma
  // mensagem instantânea e sem histórico de conversa é um padrão que os
  // sistemas antispam do WhatsApp associam a bots/automação.
  simulateTyping?: boolean;
  // Atraso fixo (ms) com presence "composing" antes do envio — usado em
  // mensagens automáticas do bot/sistema (fluxo de bot, menus de fila,
  // despedida/avaliação), para evitar respostas instantâneas que os
  // sistemas antispam do WhatsApp associam a automação.
  botDelayMs?: number;
}

// Atraso padrão (ms) aplicado às mensagens automáticas do bot/sistema.
export const BOT_MESSAGE_DELAY_MS = 400;

export interface SendMediaOptions {
  caption?: string;
  sendAudioAsVoice?: boolean;
  sendMediaAsDocument?: boolean;
  quotedMessageId?: string;
}

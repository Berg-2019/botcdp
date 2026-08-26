import { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/api';
import { getSocket } from '@/services/socket';
import type { Message, Ticket } from '@/types';

// Busca mensagens/ticket por id e mantém atualizado via socket — usado tanto
// pela tela de chat principal quanto pela janela flutuante (Picture-in-Picture),
// que precisa acompanhar uma conversa de forma independente do que está
// montado na tela principal.
export function useTicketMessages(ticketId: number | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [ticket, setTicket] = useState<Ticket | null>(null);

  const fetchMessages = useCallback(async () => {
    if (ticketId == null) return;
    try {
      const data = await api.getMessages(ticketId);
      setMessages(data.messages || []);
    } catch { }
  }, [ticketId]);

  const fetchTicket = useCallback(async () => {
    if (ticketId == null) return;
    try {
      setTicket(await api.getTicket(ticketId));
    } catch { }
  }, [ticketId]);

  useEffect(() => {
    if (ticketId == null) {
      setMessages([]);
      setTicket(null);
      return;
    }
    fetchTicket();
    fetchMessages();
  }, [ticketId, fetchTicket, fetchMessages]);

  useEffect(() => {
    if (ticketId == null) return;
    const socket = getSocket();
    socket.emit('joinChatBox', ticketId.toString());

    const handler = (data: any) => {
      if (data?.message?.ticketId === ticketId || data?.ticketId === ticketId) {
        fetchMessages();
      }
    };
    socket.on('appMessage', handler);
    return () => {
      socket.off('appMessage', handler);
    };
  }, [ticketId, fetchMessages]);

  return { messages, ticket, setTicket, fetchMessages, fetchTicket };
}

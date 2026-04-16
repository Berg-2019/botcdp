import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getSocket } from '@/services/socket';
import { showNotification, requestNotificationPermission, hasAskedPermission } from '@/services/notifications';

export function useNotifications() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const asked = useRef(false);

  // Ask permission once after login
  useEffect(() => {
    if (isAuthenticated && !asked.current && !hasAskedPermission()) {
      asked.current = true;
      // Small delay so user sees the app first
      setTimeout(() => requestNotificationPermission(), 3000);
    }
  }, [isAuthenticated]);

  // Listen to socket events
  useEffect(() => {
    if (!isAuthenticated) return;

    const socket = getSocket();

    const handleNewMessage = (data: any) => {
      const msg = data?.message || data;
      if (!msg) return;
      // Don't notify own messages
      if (msg.fromMe) return;

      const ticketId = msg.ticketId;
      // Don't notify if already viewing this chat
      if (location.pathname === `/chat/${ticketId}`) return;

      const contactName = data?.contact?.name || msg?.contact?.name || 'Novo';

      showNotification(`${contactName}`, {
        body: msg.body?.substring(0, 100) || '📎 Mídia',
        tag: `msg-${ticketId}`,
        onClick: () => navigate(`/chat/${ticketId}`),
      });
    };

    const handleNewTicket = (data: any) => {
      const ticket = data?.ticket || data;
      if (!ticket) return;

      const contactName = ticket?.contact?.name || 'Novo contato';

      showNotification('Novo ticket', {
        body: `${contactName} - ${ticket.lastMessage?.substring(0, 80) || 'Novo atendimento'}`,
        tag: `ticket-${ticket.id}`,
        onClick: () => navigate(`/chat/${ticket.id}`),
      });
    };

    socket.on('appMessage', handleNewMessage);
    socket.on('ticket', handleNewTicket);

    return () => {
      socket.off('appMessage', handleNewMessage);
      socket.off('ticket', handleNewTicket);
    };
  }, [isAuthenticated, location.pathname, navigate]);
}

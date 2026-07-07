import { io, Socket } from 'socket.io-client';
import { api } from './api';

let socket: Socket | null = null;

/**
 * Retorna (ou cria) a instância singleton do Socket.IO.
 * A autenticação é feita pelo cookie httpOnly `access_token`, enviado
 * automaticamente no handshake via `withCredentials` — nunca por query
 * string (evita vazar o token em logs/histórico).
 */
export function getSocket(): Socket {
  if (!socket) {
    const url = api.getBaseUrl();
    socket = io(url, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 3000,
      reconnectionAttempts: 10,
    });
  }
  return socket;
}

export function connectSocket() {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

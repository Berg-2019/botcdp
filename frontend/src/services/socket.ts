import { io, Socket } from 'socket.io-client';
import { api } from './api';

let socket: Socket | null = null;

/**
 * Retorna (ou cria) a instância singleton do Socket.IO.
 * O token é enviado via `query` pois o backend valida
 * `socket.handshake.query.token` na conexão.
 */
export function getSocket(): Socket {
  if (!socket) {
    const url = api.getBaseUrl();
    const token = localStorage.getItem('token') || '';
    socket = io(url, {
      transports: ['websocket', 'polling'],
      query: { token },
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 3000,
      reconnectionAttempts: 10,
    });
  }
  return socket;
}

/**
 * Conecta o socket (atualizando o token antes, caso tenha mudado).
 */
export function connectSocket() {
  const s = getSocket();
  // Atualiza o token no query a cada reconexão
  const token = localStorage.getItem('token') || '';
  (s.io.opts.query as Record<string, string>).token = token;
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

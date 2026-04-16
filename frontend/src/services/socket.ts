import { io, Socket } from 'socket.io-client';
import { api } from './api';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const url = api.getBaseUrl();
    const token = localStorage.getItem('token');
    socket = io(url, {
      transports: ['websocket', 'polling'],
      auth: { token },
      autoConnect: false,
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

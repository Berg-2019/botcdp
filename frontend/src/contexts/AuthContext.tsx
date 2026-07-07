import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { User } from '@/types';
import { api } from '@/services/api';
import { connectSocket, disconnectSocket } from '@/services/socket';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // O frontend não consegue ler o cookie httpOnly do access_token, então
    // a sessão é revalidada no boot via refresh_token (cookie `jrt`).
    api.checkSession().then(refreshedUser => {
      if (refreshedUser) {
        setUser(refreshedUser);
        // Conecta o socket para todos os perfis autenticados
        // (developer precisa para receber eventos de sessão WhatsApp)
        connectSocket();
      }
      setLoading(false);
    });
  }, []);

  const login = useCallback(async (phone: string, password: string) => {
    const u = await api.login(phone, password);
    setUser(u);
    // Conecta o socket para qualquer perfil autenticado
    connectSocket();
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    disconnectSocket();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

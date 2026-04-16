import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/services/api';
import { MessageSquare, Server } from 'lucide-react';

export default function Login() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [serverUrl, setServerUrl] = useState(api.getBaseUrl());
  const [showServer, setShowServer] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || !password.trim()) return;
    setError('');
    setLoading(true);
    try {
      api.setBaseUrl(serverUrl);
      await login(phone, password);
      // Route based on profile from API response
      const user = api.getUser();
      const profile = user?.profile || 'agent';
      const route = profile === 'admin' ? '/admin' : profile === 'developer' ? '/developer' : '/';
      navigate(route, { replace: true });
    } catch {
      setError('Login falhou. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <MessageSquare className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold">Painel do Agente</h1>
          <p className="text-sm text-muted-foreground text-center">Faça login para acessar seus atendimentos</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Telefone / Email</label>
            <Input type="text" placeholder="(11) 99999-9999 ou email" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-12 rounded-xl" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Senha</label>
            <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 rounded-xl" />
          </div>
          {error && <p className="text-sm text-destructive text-center">{error}</p>}
          <Button type="submit" className="w-full h-12 rounded-xl text-base font-semibold" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>

        {/* Server config */}
        <div className="text-center">
          <button onClick={() => setShowServer(!showServer)} className="text-xs text-muted-foreground flex items-center gap-1 mx-auto hover:text-foreground transition-colors">
            <Server className="h-3 w-3" /> Configurar servidor
          </button>
          {showServer && (
            <div className="mt-2">
              <Input type="url" placeholder="https://seu-servidor.com" value={serverUrl} onChange={(e) => setServerUrl(e.target.value)} className="h-9 text-xs rounded-lg" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

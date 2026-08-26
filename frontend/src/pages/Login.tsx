import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageSquare, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      await login(phone, password);
      const { api } = await import('@/services/api');
      const user = api.getUser();
      const profile = user?.profile || 'agent';
      const route = profile === 'admin' ? '/admin' : profile === 'developer' ? '/developer' : '/';
      navigate(route, { replace: true });
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status === 423) {
        // Conta temporariamente bloqueada por excesso de tentativas — a
        // mensagem do backend já inclui os minutos restantes.
        setError((err as Error).message);
      } else if (status === 429) {
        setError('Muitas tentativas de login. Aguarde alguns minutos e tente novamente.');
      } else {
        setError('Login falhou. Verifique suas credenciais.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm space-y-8">
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
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 rounded-xl pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>
          {error && <p className="text-sm text-destructive text-center">{error}</p>}
          <Button type="submit" className="w-full h-12 rounded-xl text-base font-semibold" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
      </div>
    </div>
  );
}

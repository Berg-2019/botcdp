import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export default function SetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-primary/5 to-primary/10 p-4">
        <div className="w-full max-w-md rounded-3xl bg-card border p-8 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Token Inválido</h1>
          <p className="text-muted-foreground mb-6">O link de redefinição de senha não é válido ou expirou.</p>
          <Button className="w-full rounded-xl" onClick={() => navigate('/login')}>
            Voltar ao Login
          </Button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password || !confirmPassword) {
      setError('Preencha todos os campos');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    try {
      setLoading(true);
      await api.setPassword({ token, password });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setError(err.message || 'Erro ao definir a senha');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-primary/5 to-primary/10 p-4">
        <div className="w-full max-w-md rounded-3xl bg-card border p-8 text-center">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Senha Definida!</h1>
          <p className="text-muted-foreground mb-6">Sua senha foi redefinida com sucesso. Você será redirecionado para o login.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-primary/5 to-primary/10 p-4">
      <div className="w-full max-w-md rounded-3xl bg-card border p-8 shadow-lg">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Definir Senha</h1>
          <p className="text-muted-foreground text-sm">Use este formulário para definir sua senha e começar a usar o sistema.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 flex gap-2">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div>
            <label className="text-sm font-medium">Nova Senha</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite uma senha segura"
              className="mt-1 rounded-xl h-10"
              disabled={loading}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Confirmar Senha</label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirme sua senha"
              className="mt-1 rounded-xl h-10"
              disabled={loading}
            />
          </div>

          <Button
            type="submit"
            className="w-full rounded-xl h-10 mt-6"
            disabled={loading}
          >
            {loading ? 'Salvando...' : 'Definir Senha'}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Mínimo 6 caracteres. Use uma mistura de letras, números e símbolos para maior segurança.
        </p>
      </div>
    </div>
  );
}

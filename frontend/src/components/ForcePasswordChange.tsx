import { useState } from 'react';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, ShieldAlert } from 'lucide-react';

// Bloqueia o uso do painel até o usuário trocar uma senha padrão/temporária
// (contas seedadas ou criadas pelo admin com mustChangePassword=true).
export function ForcePasswordChange() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Preencha todos os campos');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }
    if (
      newPassword.length < 8 ||
      !/[A-Z]/.test(newPassword) ||
      !/[a-z]/.test(newPassword) ||
      !/[0-9]/.test(newPassword)
    ) {
      setError('A nova senha deve ter no mínimo 8 caracteres, com letra maiúscula, minúscula e número');
      return;
    }

    try {
      setLoading(true);
      await api.changePassword({ currentPassword, newPassword });
      // Backend encerra a sessão atual ao trocar a senha; força novo login.
      window.location.href = '/login';
    } catch (err: any) {
      setError(err.message || 'Erro ao trocar a senha');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-primary/5 to-primary/10 p-4">
      <div className="w-full max-w-md rounded-3xl bg-card border p-8 shadow-lg">
        <div className="mb-8 flex flex-col items-center text-center gap-2">
          <ShieldAlert className="h-10 w-10 text-amber-500" />
          <h1 className="text-2xl font-bold">Troque sua senha</h1>
          <p className="text-muted-foreground text-sm">
            Sua conta ainda usa uma senha temporária/padrão. Defina uma nova senha para continuar.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 flex gap-2">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div>
            <label className="text-sm font-medium">Senha atual</label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="mt-1 rounded-xl h-10"
              disabled={loading}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Nova senha</label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1 rounded-xl h-10"
              disabled={loading}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Confirmar nova senha</label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 rounded-xl h-10"
              disabled={loading}
            />
          </div>

          <Button type="submit" className="w-full rounded-xl h-10 mt-2" disabled={loading}>
            {loading ? 'Salvando...' : 'Trocar senha'}
          </Button>
        </form>
      </div>
    </div>
  );
}

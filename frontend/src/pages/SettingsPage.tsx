import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LogOut, User, Phone, Shield, Wrench, Headphones } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex flex-col min-h-screen pb-16">
      <header className="sticky top-0 z-40 bg-card border-b px-4 py-3 safe-top">
        <h1 className="text-xl font-bold">Configurações</h1>
      </header>

      <div className="p-4 space-y-6">
        {/* Profile */}
        <div className="flex items-center gap-4 rounded-2xl bg-card p-4 border">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary text-xl font-bold">
            {user?.name?.charAt(0).toUpperCase() || <User className="h-6 w-6" />}
          </div>
          <div>
            <p className="font-semibold">{user?.name || 'Agente'}</p>
            <p className="text-sm text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> {user?.email || user?.phone || '—'}</p>
            {user?.profile && (
              <span className={cn(
                'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full mt-1 w-fit',
                user.profile === 'admin' ? 'bg-primary/10 text-primary' :
                user.profile === 'developer' ? 'bg-warning/10 text-warning' :
                'bg-success/10 text-success'
              )}>
                {user.profile === 'admin' && <Shield className="h-3 w-3" />}
                {user.profile === 'developer' && <Wrench className="h-3 w-3" />}
                {user.profile === 'agent' && <Headphones className="h-3 w-3" />}
                {user.profile}
              </span>
            )}
          </div>
        </div>

        {/* Queues */}
        {user?.queues && user.queues.length > 0 && (
          <div className="rounded-2xl bg-card p-4 border">
            <p className="text-sm font-semibold mb-2">Setores</p>
            <div className="flex flex-wrap gap-2">
              {user.queues.map((q) => (
                <span key={q.id} className="rounded-full px-3 py-1 text-xs font-medium text-primary-foreground" style={{ backgroundColor: q.color || 'hsl(var(--primary))' }}>
                  {q.name}
                </span>
              ))}
            </div>
          </div>
        )}

        <Button variant="outline" className="w-full rounded-xl h-12" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" /> Sair
        </Button>
      </div>
    </div>
  );
}

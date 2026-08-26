import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useInstallPrompt } from '@/contexts/InstallPromptContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LogOut, User, Phone, Shield, Wrench, Headphones, Server, Check, Download, Share, PlusSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/services/api';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { canInstall, isStandalone, isIOS, promptInstall } = useInstallPrompt();
  const [serverUrl, setServerUrl] = useState(api.getBaseUrl());
  const [saved, setSaved] = useState(false);
  const [installOutcome, setInstallOutcome] = useState<'accepted' | 'dismissed' | null>(null);

  const handleInstall = async () => {
    const outcome = await promptInstall();
    if (outcome === 'accepted' || outcome === 'dismissed') setInstallOutcome(outcome);
  };

  const handleLogout = async () => {
    // Espera a sessão realmente encerrar antes de navegar — sem isso,
    // isAuthenticated ainda está true no momento da navegação e a rota
    // /login redireciona de volta para a tela anterior (App.tsx).
    await logout();
    navigate('/login', { replace: true });
  };

  const handleSaveServer = () => {
    api.setBaseUrl(serverUrl.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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

        {/* Server config */}
        <div className="rounded-2xl bg-card p-4 border space-y-3">
          <p className="text-sm font-semibold flex items-center gap-2">
            <Server className="h-4 w-4 text-muted-foreground" /> Servidor
          </p>
          <Input
            type="url"
            placeholder="https://agentes.casadosparafusosvta.com"
            value={serverUrl}
            onChange={(e) => { setServerUrl(e.target.value); setSaved(false); }}
            className="h-10 text-sm rounded-xl"
          />
          <Button
            variant="outline"
            size="sm"
            className="w-full rounded-xl"
            onClick={handleSaveServer}
          >
            {saved ? <><Check className="h-4 w-4 mr-2 text-green-500" /> Salvo</> : 'Salvar URL do servidor'}
          </Button>
        </div>

        {/* Instalar aplicativo (acesso rápido no computador/celular) */}
        <div className="rounded-2xl bg-card p-4 border space-y-3">
          <p className="text-sm font-semibold flex items-center gap-2">
            <Download className="h-4 w-4 text-muted-foreground" /> Acesso rápido
          </p>

          {isStandalone ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" /> Já instalado neste dispositivo
            </p>
          ) : canInstall ? (
            <>
              <p className="text-sm text-muted-foreground">
                Instale o painel como um app para abrir direto da tela inicial ou da área de trabalho, sem precisar do navegador.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full rounded-xl"
                onClick={handleInstall}
              >
                {installOutcome === 'accepted' ? <><Check className="h-4 w-4 mr-2 text-green-500" /> Instalado</> : 'Instalar aplicativo'}
              </Button>
            </>
          ) : isIOS ? (
            <p className="text-sm text-muted-foreground space-y-1">
              No iPhone/iPad: toque em <Share className="h-3.5 w-3.5 inline mx-0.5 -mt-0.5" /> (Compartilhar) na barra do Safari e depois em{' '}
              <span className="inline-flex items-center gap-0.5 font-medium text-foreground"><PlusSquare className="h-3.5 w-3.5" /> Adicionar à Tela de Início</span>.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Seu navegador ainda não liberou a instalação. Tente pelo Chrome, Edge ou Safari mais recentes.
            </p>
          )}
        </div>

        <Button variant="outline" className="w-full rounded-xl h-12" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" /> Sair
        </Button>
      </div>
    </div>
  );
}

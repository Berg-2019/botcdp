import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';
import { useInstallPrompt } from '@/contexts/InstallPromptContext';

const DISMISSED_KEY = 'pwa_install_dismissed';

// Banner flutuante que aparece quando o navegador oferece a instalação
// (Android/Chrome/Edge). iOS Safari não dispara beforeinstallprompt — quem
// usa iOS precisa instalar pelo botão manual em Configurações.
export function InstallPrompt() {
  const { canInstall, isStandalone, promptInstall } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISSED_KEY) === 'true');

  if (!canInstall || isStandalone || dismissed) return null;

  const handleInstall = async () => {
    await promptInstall();
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, 'true');
    setDismissed(true);
  };

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-lg sm:left-auto sm:right-4 sm:max-w-sm">
      <Download className="h-5 w-5 flex-shrink-0 text-primary" />
      <div className="flex-1 text-sm">
        <p className="font-medium">Instalar o app</p>
        <p className="text-muted-foreground">Acesse o painel direto da tela inicial.</p>
      </div>
      <Button size="sm" className="rounded-xl" onClick={handleInstall}>Instalar</Button>
      <button onClick={handleDismiss} aria-label="Dispensar" className="text-muted-foreground hover:text-foreground">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

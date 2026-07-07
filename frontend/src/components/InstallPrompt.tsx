import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'pwa_install_dismissed';

// Captura o evento beforeinstallprompt (Android/Chrome) e mostra um banner
// próprio, já que o navegador não exibe o prompt nativo de forma confiável
// sozinho. iOS Safari não dispara esse evento — não tem como oferecer aqui.
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISSED_KEY) === 'true');

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!deferredPrompt || dismissed) return null;

  const handleInstall = async () => {
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
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

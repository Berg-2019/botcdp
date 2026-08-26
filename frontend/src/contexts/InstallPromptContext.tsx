import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type PromptResult = 'accepted' | 'dismissed' | 'unavailable';

interface InstallPromptContextType {
  // true quando o navegador ofereceu o evento nativo de instalação (Chrome/Edge/Android).
  canInstall: boolean;
  // true se o app já está rodando instalado (standalone), em qualquer plataforma.
  isStandalone: boolean;
  // iOS Safari nunca dispara beforeinstallprompt — só dá pra orientar manualmente.
  isIOS: boolean;
  promptInstall: () => Promise<PromptResult>;
}

const InstallPromptContext = createContext<InstallPromptContextType>({
  canInstall: false,
  isStandalone: false,
  isIOS: false,
  promptInstall: async () => 'unavailable'
});

export const useInstallPrompt = () => useContext(InstallPromptContext);

const detectStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (window.navigator as unknown as { standalone?: boolean }).standalone === true;

const detectIOS = () =>
  /iphone|ipad|ipod/i.test(window.navigator.userAgent) && !('MSStream' in window);

// Captura o beforeinstallprompt uma única vez no topo da árvore e distribui
// para qualquer componente (banner flutuante, botão em Configurações etc.)
// — o navegador só dispara esse evento uma vez, então precisa ser compartilhado.
export function InstallPromptProvider({ children }: { children: ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(detectStandalone);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const handleInstalled = () => {
      setIsStandalone(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const promptInstall = async (): Promise<PromptResult> => {
    if (!deferredPrompt) return 'unavailable';
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    return outcome;
  };

  return (
    <InstallPromptContext.Provider
      value={{ canInstall: !!deferredPrompt, isStandalone, isIOS: detectIOS(), promptInstall }}
    >
      {children}
    </InstallPromptContext.Provider>
  );
}

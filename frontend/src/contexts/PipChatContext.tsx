import { createContext, useContext, useRef, useState, ReactNode } from 'react';

interface DocumentPictureInPicture {
  window: Window | null;
  requestWindow: (options?: { width?: number; height?: number }) => Promise<Window>;
}

declare global {
  interface Window {
    documentPictureInPicture?: DocumentPictureInPicture;
  }
}

interface PipChatContextType {
  isSupported: boolean;
  activeTicketId: number | null;
  activeContactName: string | null;
  // Janela flutuante atual, exposta para quem precisa renderizar o portal
  // (ver PipChatPortal.tsx) — mantida separada do componente de conteúdo
  // para não criar import circular entre este arquivo e PipChatView.tsx.
  pipWindow: Window | null;
  openPip: (ticketId: number, contactName: string) => Promise<void>;
  closePip: () => void;
  focusOpener: () => void;
}

const PipChatContext = createContext<PipChatContextType>({
  isSupported: false,
  activeTicketId: null,
  activeContactName: null,
  pipWindow: null,
  openPip: async () => { },
  closePip: () => { },
  focusOpener: () => { }
});

export const usePipChat = () => useContext(PipChatContext);

// Clona os estilos da página principal para dentro da janela PiP — ela não
// herda automaticamente as <link>/<style> do documento que a abriu.
function copyStyles(pipWindow: Window) {
  Array.from(document.styleSheets).forEach(sheet => {
    try {
      const css = Array.from(sheet.cssRules)
        .map(rule => rule.cssText)
        .join('');
      const style = pipWindow.document.createElement('style');
      style.textContent = css;
      pipWindow.document.head.appendChild(style);
    } catch {
      // Stylesheet cross-origin (ex.: Google Fonts) — cssRules não é acessível,
      // então clona o <link> em vez de reserializar as regras.
      if (sheet.href) {
        const link = pipWindow.document.createElement('link');
        link.rel = 'stylesheet';
        link.href = sheet.href;
        pipWindow.document.head.appendChild(link);
      }
    }
  });
}

// Mantém a janela flutuante (Picture-in-Picture) de uma conversa destacada.
// Montado uma vez na raiz do app para sobreviver à navegação entre telas —
// a conversa destacada continua visível mesmo se o usuário for para outra
// tela do painel, já que o estado não depende do Chat.tsx estar montado.
export function PipChatProvider({ children }: { children: ReactNode }) {
  const isSupported = typeof window !== 'undefined' && 'documentPictureInPicture' in window;
  const [activeTicketId, setActiveTicketId] = useState<number | null>(null);
  const [activeContactName, setActiveContactName] = useState<string | null>(null);
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  // Espelha `pipWindow` para leitura síncrona dentro de openPip (o estado só
  // fica visível a partir do próximo render).
  const pipWindowRef = useRef<Window | null>(null);

  const resetState = () => {
    pipWindowRef.current = null;
    setPipWindow(null);
    setActiveTicketId(null);
    setActiveContactName(null);
  };

  const openPip = async (ticketId: number, contactName: string) => {
    if (!isSupported) return;

    // Já existe uma janela aberta — só troca qual conversa ela mostra, sem
    // fechar/reabrir (evita flash e o usuário ter que reposicionar de novo).
    if (pipWindowRef.current && !pipWindowRef.current.closed) {
      setActiveTicketId(ticketId);
      setActiveContactName(contactName);
      return;
    }

    const win = await window.documentPictureInPicture!.requestWindow({
      width: 380,
      height: 560
    });

    copyStyles(win);
    win.document.body.style.margin = '0';
    win.addEventListener('pagehide', resetState, { once: true });

    pipWindowRef.current = win;
    setPipWindow(win);
    setActiveTicketId(ticketId);
    setActiveContactName(contactName);
  };

  const closePip = () => {
    pipWindowRef.current?.close();
  };

  const focusOpener = () => {
    window.focus();
  };

  return (
    <PipChatContext.Provider
      value={{ isSupported, activeTicketId, activeContactName, pipWindow, openPip, closePip, focusOpener }}
    >
      {children}
    </PipChatContext.Provider>
  );
}

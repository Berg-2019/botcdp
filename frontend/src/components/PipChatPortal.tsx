import { createPortal } from 'react-dom';
import { usePipChat } from '@/contexts/PipChatContext';
import { PipChatView } from '@/components/PipChatView';

// Faz a ponte entre o estado da janela PiP (PipChatContext) e o conteúdo
// renderizado dentro dela (PipChatView) — separado em componente próprio
// para não criar import circular entre o context e a view.
export function PipChatPortal() {
  const { pipWindow } = usePipChat();
  if (!pipWindow || pipWindow.closed) return null;
  return createPortal(<PipChatView />, pipWindow.document.body);
}

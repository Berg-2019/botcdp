import { useEffect, useRef, useState } from 'react';
import { ExternalLink, Send } from 'lucide-react';
import { ChatBubble } from '@/components/ChatBubble';
import { useTicketMessages } from '@/hooks/useTicketMessages';
import { usePipChat } from '@/contexts/PipChatContext';
import { api } from '@/services/api';

// Conteúdo renderizado dentro da janela flutuante (Picture-in-Picture) de
// uma conversa destacada. Suporta receber (via useTicketMessages, mesmo
// socket da tela principal) e enviar mensagens de texto — envio de mídia
// continua exclusivo da tela principal do chat.
export function PipChatView() {
  const { activeTicketId, activeContactName, focusOpener } = usePipChat();
  const { messages, fetchMessages } = useTicketMessages(activeTicketId);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() || sending || activeTicketId == null) return;
    const messageText = text.trim();
    setText('');
    setSending(true);
    try {
      await api.sendMessage(activeTicketId, messageText);
      await fetchMessages();
    } catch {
      // Falha silenciosa, igual ao comportamento da tela principal do chat.
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-muted/30">
      <header className="flex items-center gap-2 border-b bg-card px-3 py-2 shrink-0">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
          {activeContactName?.charAt(0).toUpperCase() || '?'}
        </div>
        <span className="font-semibold text-sm truncate flex-1">{activeContactName || 'Conversa'}</span>
        <button
          onClick={focusOpener}
          title="Voltar ao painel"
          aria-label="Voltar ao painel"
          className="text-muted-foreground hover:text-foreground shrink-0"
        >
          <ExternalLink className="h-4 w-4" />
        </button>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto py-2">
        {messages.map(msg => (
          <ChatBubble key={msg.id} message={msg} />
        ))}
      </div>

      <div className="border-t bg-card px-2 py-1.5 shrink-0">
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Digite uma mensagem..."
            className="flex-1 h-9 rounded-full bg-muted/50 border-0 px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={handleSend}
            disabled={sending || !text.trim()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50 transition-opacity"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

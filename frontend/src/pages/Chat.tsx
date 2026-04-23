import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Zap, User, Paperclip, Image, Camera, Loader2, CheckCircle2, Circle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ChatBubble } from '@/components/ChatBubble';
import { QuickReplyPicker } from '@/components/QuickReplyPicker';
import { ContactDrawer } from '@/components/ContactDrawer';
import { AudioRecorder } from '@/components/AudioRecorder';
import { api } from '@/services/api';
import { getSocket } from '@/services/socket';
import type { Message, Ticket } from '@/types';

const STATUS_LABELS = {
  pending: { label: 'Pendente', color: 'bg-amber-100 text-amber-800', icon: Circle },
  open: { label: 'Em Atendimento', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  closed: { label: 'Finalizado', color: 'bg-gray-100 text-gray-600', icon: CheckCircle2 },
};

export default function Chat() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [text, setText] = useState('');
  const [showQuick, setShowQuick] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [sending, setSending] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const ticketId = Number(id);

  const fetchMessages = useCallback(async () => {
    try {
      const data = await api.getMessages(ticketId);
      setMessages(data.messages || []);
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: 'smooth'
        });
      });
    } catch { }
  }, [ticketId]);

  const fetchTicket = useCallback(async () => {
    try {
      setTicket(await api.getTicket(ticketId));
    } catch { }
  }, [ticketId]);

  useEffect(() => {
    fetchTicket();
    fetchMessages();
  }, [fetchTicket, fetchMessages]);

  useEffect(() => {
    const socket = getSocket();
    socket.emit("joinChatBox", ticketId.toString());

    const handler = (data: any) => {
      if (data?.message?.ticketId === ticketId || data?.ticketId === ticketId) {
        fetchMessages();
      }
    };
    socket.on('appMessage', handler);
    return () => {
      socket.off('appMessage', handler);
    };
  }, [ticketId, fetchMessages]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    const messageText = text.trim();
    setText('');
    setSending(true);
    try {
      await api.sendMessage(ticketId, messageText);
      inputRef.current && (inputRef.current.value = '');
      inputRef.current?.focus();
      await fetchMessages();
    } catch { } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setSending(true);
    setShowAttach(false);
    try {
      for (const file of Array.from(files)) {
        await api.sendMedia(ticketId, file, text.trim());
      }
      setText('');
      await fetchMessages();
    } catch { } finally {
      setSending(false);
    }
  };

  const handleAudioRecorded = async (blob: Blob) => {
    setSending(true);
    try {
      await api.sendMedia(ticketId, blob);
      await fetchMessages();
    } catch { } finally {
      setSending(false);
    }
  };

  const handleAcceptTicket = async () => {
    if (!ticket || accepting) return;
    setAccepting(true);
    try {
      const updated = await api.updateTicket(ticketId, { status: 'open' });
      setTicket(updated);
    } catch { } finally {
      setAccepting(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-muted/30">
      {/* Header */}
      <header className="flex items-center gap-3 border-b bg-card px-3 py-2.5 safe-top">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <button onClick={() => setShowContact(true)} className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
            {ticket?.contact.name.charAt(0).toUpperCase() || '?'}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{ticket?.contact.name || 'Carregando...'}</p>
            {ticket?.queue && <p className="text-[10px] text-muted-foreground">{ticket.queue.name}</p>}
          </div>
        </button>
        {ticket?.status && (
          <span className={`text-[10px] font-medium px-2 py-1 rounded-full ${STATUS_LABELS[ticket.status as keyof typeof STATUS_LABELS]?.color || ''}`}>
            {STATUS_LABELS[ticket.status as keyof typeof STATUS_LABELS]?.label || ticket.status}
          </span>
        )}
        <button onClick={() => setShowContact(true)} className="text-muted-foreground hover:text-foreground">
          <User className="h-5 w-5" />
        </button>
      </header>

      {/* Accept ticket banner */}
      {ticket?.status === 'pending' && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Circle className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-800">Ticket pendente - Aguardando aceite</span>
            </div>
            <Button
              size="sm"
              onClick={handleAcceptTicket}
              disabled={accepting}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {accepting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
              Aceitar Ticket
            </Button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-3">
        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} />
        ))}
        {sending && (
          <div className="flex justify-center py-2">
            <span className="text-xs text-muted-foreground animate-pulse">Enviando...</span>
          </div>
        )}
      </div>

      {/* Attach menu */}
      {showAttach && (
        <div className="border-t bg-card px-4 py-3">
          <div className="flex justify-center gap-6">
            <button
              onClick={() => imageInputRef.current?.click()}
              className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Image className="h-5 w-5 text-primary" />
              </div>
              <span className="text-[10px]">Galeria</span>
            </button>
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Camera className="h-5 w-5 text-primary" />
              </div>
              <span className="text-[10px]">Câmera</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Paperclip className="h-5 w-5 text-primary" />
              </div>
              <span className="text-[10px]">Arquivo</span>
            </button>
          </div>
        </div>
      )}

      {/* Hidden file inputs */}
      <input ref={imageInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={(e) => handleFileUpload(e.target.files)} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFileUpload(e.target.files)} />
      <input ref={fileInputRef} type="file" accept="*/*" multiple className="hidden" onChange={(e) => handleFileUpload(e.target.files)} />

      {/* Input */}
      <div className="relative border-t bg-card px-3 py-2 safe-bottom">
        <QuickReplyPicker open={showQuick} onClose={() => setShowQuick(false)} onSelect={(t) => setText(t)} />
        <div className="flex items-center gap-1.5">
          <button onClick={() => setShowQuick(!showQuick)} className="text-muted-foreground hover:text-primary shrink-0">
            <Zap className="h-5 w-5" />
          </button>
          <button onClick={() => setShowAttach(!showAttach)} className="text-muted-foreground hover:text-primary shrink-0">
            <Paperclip className="h-5 w-5" />
          </button>
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Digite uma mensagem..."
            className="flex-1 h-10 rounded-full bg-muted/50 border-0 px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {text.trim() ? (
            <button
              onClick={handleSend}
              disabled={sending}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50 transition-opacity"
            >
              <Send className="h-4 w-4" />
            </button>
          ) : (
            <AudioRecorder onRecorded={handleAudioRecorded} disabled={sending} />
          )}
        </div>
      </div>

      {/* Contact drawer */}
      <ContactDrawer ticket={ticket} open={showContact} onClose={() => setShowContact(false)} onUpdate={() => { fetchTicket(); navigate('/'); }} />
    </div>
  );
}

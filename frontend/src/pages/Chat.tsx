import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Zap, User, Paperclip, Image, Camera } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ChatBubble } from '@/components/ChatBubble';
import { QuickReplyPicker } from '@/components/QuickReplyPicker';
import { ContactDrawer } from '@/components/ContactDrawer';
import { AudioRecorder } from '@/components/AudioRecorder';
import { api } from '@/services/api';
import { getSocket } from '@/services/socket';
import type { Message, Ticket } from '@/types';

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const ticketId = Number(id);

  const scrollToBottom = () => {
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 100);
  };

  const fetchMessages = useCallback(async () => {
    try {
      const data = await api.getMessages(ticketId);
      setMessages((data.messages || []).reverse());
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

  useEffect(() => scrollToBottom(), [messages.length]);

  useEffect(() => {
    const socket = getSocket();
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
    setSending(true);
    try {
      await api.sendMessage(ticketId, text.trim());
      setText('');
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
        <button onClick={() => setShowContact(true)} className="text-muted-foreground hover:text-foreground">
          <User className="h-5 w-5" />
        </button>
      </header>

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
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Digite uma mensagem..."
            className="flex-1 h-10 rounded-full bg-muted/50 border-0"
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

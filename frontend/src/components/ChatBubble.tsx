import type { Message } from '@/types';
import { cn } from '@/lib/utils';
import { Check, CheckCheck, FileText, Download } from 'lucide-react';
import { AudioPlayer } from './AudioPlayer';

function formatTime(date: string) {
  return new Date(date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function MediaContent({ message }: { message: Message }) {
  const { mediaUrl, mediaType } = message;
  if (!mediaUrl) return null;

  const fromMe = message.fromMe;

  // Image
  if (mediaType?.startsWith('image')) {
    return (
      <a href={mediaUrl} target="_blank" rel="noreferrer" className="block mb-1">
        <img src={mediaUrl} alt="" className="rounded-lg max-w-full max-h-60 object-cover" loading="lazy" />
      </a>
    );
  }

  // Video
  if (mediaType?.startsWith('video')) {
    return (
      <div className="mb-1 rounded-lg overflow-hidden max-w-full">
        <video src={mediaUrl} controls preload="metadata" className="max-w-full max-h-60 rounded-lg" />
      </div>
    );
  }

  // Audio
  if (mediaType?.startsWith('audio') || mediaUrl?.match(/\.(ogg|mp3|wav|m4a|opus|oga)$/i)) {
    return (
      <div className="mb-1">
        <AudioPlayer src={mediaUrl} fromMe={fromMe} />
      </div>
    );
  }

  // Other files (PDF, docs, etc.)
  return (
    <a
      href={mediaUrl}
      target="_blank"
      rel="noreferrer"
      className={cn(
        'flex items-center gap-2 mb-1 p-2 rounded-lg text-xs',
        fromMe ? 'bg-primary-foreground/10' : 'bg-muted'
      )}
    >
      <FileText className="h-5 w-5 shrink-0" />
      <span className="flex-1 truncate">{mediaUrl.split('/').pop() || 'Arquivo'}</span>
      <Download className="h-4 w-4 shrink-0 opacity-60" />
    </a>
  );
}

export function ChatBubble({ message }: { message: Message }) {
  const fromMe = message.fromMe;

  return (
    <div className={cn('flex px-3 mb-1', fromMe ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm',
          fromMe
            ? 'bg-primary text-primary-foreground rounded-br-md'
            : 'bg-card border rounded-bl-md'
        )}
      >
        <MediaContent message={message} />
        {message.body && <p className="whitespace-pre-wrap break-words">{message.body}</p>}
        <div className={cn('flex items-center justify-end gap-1 mt-0.5', fromMe ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
          <span className="text-[10px]">{formatTime(message.createdAt)}</span>
          {fromMe && (message.read ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />)}
        </div>
      </div>
    </div>
  );
}

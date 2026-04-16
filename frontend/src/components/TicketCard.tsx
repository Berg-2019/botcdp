import { useNavigate } from 'react-router-dom';
import type { Ticket } from '@/types';
import { cn } from '@/lib/utils';

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export function TicketCard({ ticket }: { ticket: Ticket }) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(`/chat/${ticket.id}`)}
      className="flex w-full items-center gap-3 border-b px-4 py-3 text-left transition-colors hover:bg-muted/50 active:bg-muted"
    >
      {/* Avatar */}
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-lg">
        {ticket.contact.name.charAt(0).toUpperCase()}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-sm truncate">{ticket.contact.name}</span>
          <span className="text-xs text-muted-foreground shrink-0 ml-2">{timeAgo(ticket.updatedAt)}</span>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <p className="text-xs text-muted-foreground truncate pr-2">{ticket.lastMessage || 'Sem mensagens'}</p>
          {ticket.unreadMessages > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
              {ticket.unreadMessages}
            </span>
          )}
        </div>
        {ticket.queue && (
          <span
            className="mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium text-primary-foreground"
            style={{ backgroundColor: ticket.queue.color || 'hsl(var(--primary))' }}
          >
            {ticket.queue.name}
          </span>
        )}
      </div>
    </button>
  );
}

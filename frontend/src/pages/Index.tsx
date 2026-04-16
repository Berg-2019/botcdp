import { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TicketCard } from '@/components/TicketCard';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { getSocket } from '@/services/socket';
import type { Ticket } from '@/types';

const STATUS_TABS = [
  { value: 'open', label: 'Abertos' },
  { value: 'pending', label: 'Pendentes' },
  { value: 'closed', label: 'Fechados' },
];

export default function TicketList() {
  const { user } = useAuth();
  const [status, setStatus] = useState('open');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const queueIds = user?.queues?.map((q) => q.id) || [];

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getTickets({ status, queueIds, searchParam: search || undefined });
      setTickets(data.tickets || []);
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [status, search, queueIds.join(',')]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Socket real-time
  useEffect(() => {
    const socket = getSocket();
    const handler = () => fetchTickets();
    socket.on('ticket', handler);
    socket.on('appMessage', handler);
    return () => {
      socket.off('ticket', handler);
      socket.off('appMessage', handler);
    };
  }, [fetchTickets]);

  return (
    <div className="flex flex-col min-h-screen pb-16">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b px-4 py-3 safe-top">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold">Tickets</h1>
          <button onClick={fetchTickets} disabled={loading} className="text-muted-foreground hover:text-primary transition-colors">
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar contato..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 rounded-xl bg-muted/50 border-0"
          />
        </div>

        {/* Tabs */}
        <Tabs value={status} onValueChange={setStatus}>
          <TabsList className="w-full h-9 rounded-xl bg-muted/50">
            {STATUS_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="flex-1 text-xs rounded-lg data-[state=active]:shadow-sm">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </header>

      {/* List */}
      <div className="flex-1">
        {loading && tickets.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <p className="text-sm">Nenhum ticket encontrado</p>
          </div>
        ) : (
          tickets.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} />)
        )}
      </div>
    </div>
  );
}

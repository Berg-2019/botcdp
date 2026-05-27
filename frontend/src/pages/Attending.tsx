import { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { TicketCard } from '@/components/TicketCard';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { getSocket } from '@/services/socket';
import type { Ticket } from '@/types';

export default function Attending() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);

  const isAdmin = user?.profile === 'admin' || user?.profile === 'developer';

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params: Parameters<typeof api.getTickets>[0] = { status: 'open' };
      // Admin/developer: busca todos os abertos e filtra pelo userId no frontend
      // Agente: filtra pelas filas atribuídas
      if (!isAdmin && user?.queues?.length) {
        params.queueIds = user.queues.map((q) => q.id);
      }
      const data = await api.getTickets(params);
      setTickets((data.tickets || []).filter((t) => String(t.user?.id) === String(user?.id)));
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin]);

  // Carrega ao montar
  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  // Atualiza em tempo real quando qualquer ticket muda
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
      <header className="sticky top-0 z-40 bg-card border-b px-4 py-3 safe-top">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Em Atendimento</h1>
          <button onClick={fetchTickets} disabled={loading} className="text-muted-foreground hover:text-primary transition-colors">
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>
      <div className="flex-1">
        {loading && tickets.length === 0 ? (
          <div className="flex items-center justify-center py-20"><RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground"><p className="text-sm">Nenhum atendimento ativo</p></div>
        ) : (
          tickets.map((t) => <TicketCard key={t.id} ticket={t} />)
        )}
      </div>
    </div>
  );
}

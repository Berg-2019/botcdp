import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, Cell } from 'recharts';
import { Ticket, Clock, CheckCircle, TrendingUp, AlertTriangle, Users } from 'lucide-react';
import type { DashboardStats, TicketsByQueue, AgentPerformance, VolumeByPeriod, SLAByQueue } from '@/types';
import { api } from '@/services/api';
import { cn } from '@/lib/utils';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [byQueue, setByQueue] = useState<TicketsByQueue[]>([]);
  const [agents, setAgents] = useState<AgentPerformance[]>([]);
  const [volume, setVolume] = useState<VolumeByPeriod[]>([]);
  const [sla, setSla] = useState<SLAByQueue[]>([]);
  const [tab, setTab] = useState<'overview' | 'agents' | 'sla'>('overview');

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsData, queueData, agentData, volumeData, slaData] = await Promise.all([
          api.getDashboardStats(),
          api.getTicketsByQueue(),
          api.getAgentPerformance(),
          api.getVolumeByPeriod(),
          api.getSLAByQueue(),
        ]);
        setStats(statsData);
        setByQueue(queueData);
        setAgents(agentData);
        setVolume(volumeData);
        setSla(slaData);
      } catch (err) {
        console.error('Erro ao carregar dashboard:', err);
      }
    }
    fetchData();
  }, []);

  if (!stats) return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  const kpis = [
    { label: 'Abertos', value: stats.totalOpen, icon: Ticket, color: 'text-primary' },
    { label: 'Pendentes', value: stats.totalPending, icon: Clock, color: 'text-warning' },
    { label: 'Fechados', value: stats.totalClosed, icon: CheckCircle, color: 'text-success' },
    { label: 'Tempo Resp.', value: `${stats.avgResponseTime}m`, icon: TrendingUp, color: 'text-primary' },
  ];

  const tabs = [
    { key: 'overview' as const, label: 'Visão Geral' },
    { key: 'agents' as const, label: 'Agentes' },
    { key: 'sla' as const, label: 'SLA' },
  ];

  return (
    <div className="flex flex-col min-h-screen pb-20">
      <header className="sticky top-0 z-40 bg-card border-b px-4 py-3 safe-top">
        <h1 className="text-xl font-bold">Dashboard</h1>
        <p className="text-xs text-muted-foreground">Olá, {user?.name}</p>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 p-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl bg-card border p-3">
            <div className="flex items-center gap-2 mb-1">
              <k.icon className={cn('h-4 w-4', k.color)} />
              <span className="text-xs text-muted-foreground">{k.label}</span>
            </div>
            <p className="text-2xl font-bold">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Today summary */}
      <div className="mx-4 rounded-2xl bg-primary/5 border border-primary/20 p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Hoje</p>
          <p className="text-xs text-muted-foreground">{stats.todayTickets} tickets · {stats.todayResolved} resolvidos</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-primary">{Math.round((stats.todayResolved / stats.todayTickets) * 100)}%</p>
          <p className="text-xs text-muted-foreground">resolução</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mx-4 mt-4 p-1 bg-muted rounded-xl">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'flex-1 py-2 text-xs font-medium rounded-lg transition-colors',
              tab === t.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-4">
        {tab === 'overview' && (
          <>
            {/* Tickets by Queue */}
            <div className="rounded-2xl bg-card border p-4">
              <h3 className="text-sm font-semibold mb-3">Tickets por Setor</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byQueue}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="queue" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="open" name="Abertos" stackId="a" fill="hsl(217, 91%, 60%)" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="pending" name="Pendentes" stackId="a" fill="hsl(38, 92%, 50%)" />
                    <Bar dataKey="closed" name="Fechados" stackId="a" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Volume chart */}
            <div className="rounded-2xl bg-card border p-4">
              <h3 className="text-sm font-semibold mb-3">Volume (7 dias)</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={volume}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="tickets" name="Recebidos" stroke="hsl(217, 91%, 60%)" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="resolved" name="Resolvidos" stroke="hsl(142, 71%, 45%)" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

        {tab === 'agents' && (
          <div className="rounded-2xl bg-card border overflow-hidden">
            <div className="p-3 border-b flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Desempenho por Agente</h3>
            </div>
            <div className="divide-y">
              {agents.map((a) => (
                <div key={a.id} className="p-3 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                    {a.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{a.name}</p>
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span>{a.openTickets} abertos</span>
                      <span>{a.closedToday} fechados</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{a.avgResponseMin}m</p>
                    <div className="flex items-center gap-1 text-xs">
                      <span className={a.satisfaction >= 90 ? 'text-success' : 'text-warning'}>{a.satisfaction}%</span>
                      <span className="text-muted-foreground">sat.</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'sla' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <AlertTriangle className="h-4 w-4 text-warning" />
              SLA por Setor
            </div>
            {sla.map((s) => (
              <div key={s.queue} className="rounded-2xl bg-card border p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-sm font-medium">{s.queue}</span>
                  </div>
                  <span className={cn(
                    'text-sm font-bold',
                    s.withinSLA >= 90 ? 'text-success' : s.withinSLA >= 80 ? 'text-warning' : 'text-destructive'
                  )}>
                    {s.withinSLA}% dentro do SLA
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 mb-3">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{ width: `${s.withinSLA}%`, backgroundColor: s.color }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>
                    <span>1ª Resposta: </span>
                    <span className="font-medium text-foreground">{s.avgFirstResponse}min</span>
                  </div>
                  <div>
                    <span>Resolução: </span>
                    <span className="font-medium text-foreground">{s.avgResolution}min</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

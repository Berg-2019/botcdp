import { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { cn } from '@/lib/utils';
import { MessageSquareText, FolderTree, Users, Bot, Settings, ChevronRight, ToggleLeft, ToggleRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import type { GreetingConfig, BotFlow, SystemUser, GeneralSettings, Queue } from '@/types';

type Tab = 'greetings' | 'queues' | 'users' | 'bot' | 'general';

const tabItems: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: 'greetings', label: 'Saudações', icon: MessageSquareText },
  { key: 'queues', label: 'Setores', icon: FolderTree },
  { key: 'users', label: 'Usuários', icon: Users },
  { key: 'bot', label: 'Bot', icon: Bot },
  { key: 'general', label: 'Geral', icon: Settings },
];

export default function DeveloperPanel() {
  const [tab, setTab] = useState<Tab>('greetings');
  const [greetings, setGreetings] = useState<GreetingConfig[]>([]);
  const [queues, setQueues] = useState<Queue[]>([]);
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [botFlows, setBotFlows] = useState<BotFlow[]>([]);
  const [settings, setSettings] = useState<GeneralSettings | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [greetingsData, queuesData, usersData, botFlowsData, settingsData] = await Promise.all([
          api.getGreetings(),
          api.getQueues(),
          api.getUsers(),
          api.getBotFlows(),
          api.getGeneralSettings(),
        ]);
        setGreetings(greetingsData);
        setQueues(queuesData);
        setUsers(usersData);
        setBotFlows(botFlowsData);
        setSettings(settingsData);
      } catch (err) {
        console.error('Erro ao carregar configurações:', err);
      }
    }
    fetchData();
  }, []);

  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="flex flex-col min-h-screen pb-20">
      <header className="sticky top-0 z-40 bg-card border-b px-4 py-3 safe-top">
        <h1 className="text-xl font-bold">Configurações do Sistema</h1>
        <p className="text-xs text-muted-foreground">Painel Developer</p>
      </header>

      {/* Tab bar - horizontal scroll */}
      <div className="flex gap-1 px-4 py-3 overflow-x-auto no-scrollbar">
        {tabItems.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-colors',
              tab === t.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            )}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-3">
        {/* Greetings */}
        {tab === 'greetings' && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Mensagens de Saudação</h2>
              <Button size="sm" variant="outline" className="rounded-xl h-8 text-xs">
                <Plus className="h-3 w-3 mr-1" /> Nova
              </Button>
            </div>
            {greetings.map((g) => (
              <div key={g.id} className="rounded-2xl bg-card border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{g.queueName}</span>
                  <Switch checked={g.enabled} onCheckedChange={(v) => {
                    setGreetings(prev => prev.map(x => x.id === g.id ? { ...x, enabled: v } : x));
                  }} />
                </div>
                <Textarea
                  value={g.message}
                  onChange={(e) => setGreetings(prev => prev.map(x => x.id === g.id ? { ...x, message: e.target.value } : x))}
                  className="text-sm min-h-[60px] rounded-xl"
                />
              </div>
            ))}
          </>
        )}

        {/* Queues */}
        {tab === 'queues' && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Setores / Filas</h2>
              <Button size="sm" variant="outline" className="rounded-xl h-8 text-xs">
                <Plus className="h-3 w-3 mr-1" /> Novo Setor
              </Button>
            </div>
            {queues.map((q) => (
              <div key={q.id} className="rounded-2xl bg-card border p-4 flex items-center gap-3">
                <div className="h-4 w-4 rounded-full" style={{ backgroundColor: q.color }} />
                <span className="text-sm font-medium flex-1">{q.name}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            ))}
          </>
        )}

        {/* Users */}
        {tab === 'users' && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Usuários</h2>
              <Button size="sm" variant="outline" className="rounded-xl h-8 text-xs">
                <Plus className="h-3 w-3 mr-1" /> Novo
              </Button>
            </div>
            {users.map((u) => (
              <div key={u.id} className="rounded-2xl bg-card border p-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                  {u.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{u.name}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </div>
                <span className={cn(
                  'text-xs font-medium px-2 py-0.5 rounded-full',
                  u.profile === 'admin' ? 'bg-primary/10 text-primary' :
                  u.profile === 'developer' ? 'bg-warning/10 text-warning' :
                  'bg-muted text-muted-foreground'
                )}>
                  {u.profile}
                </span>
              </div>
            ))}
          </>
        )}

        {/* Bot Flows */}
        {tab === 'bot' && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Fluxos do Bot</h2>
              <Button size="sm" variant="outline" className="rounded-xl h-8 text-xs">
                <Plus className="h-3 w-3 mr-1" /> Novo Fluxo
              </Button>
            </div>
            {botFlows.map((f) => (
              <div key={f.id} className="rounded-2xl bg-card border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{f.name}</p>
                    <p className="text-xs text-muted-foreground">{f.queueName} · {f.steps.length} etapas</p>
                  </div>
                  <Switch checked={f.enabled} onCheckedChange={(v) => {
                    setBotFlows(prev => prev.map(x => x.id === f.id ? { ...x, enabled: v } : x));
                  }} />
                </div>
                <div className="space-y-2">
                  {f.steps.map((s, i) => (
                    <div key={s.id} className="rounded-xl bg-muted/50 p-3 text-xs">
                      <p className="font-medium text-muted-foreground mb-1">Etapa {i + 1}</p>
                      <p className="mb-1">{s.message}</p>
                      {s.options.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {s.options.map((o, oi) => (
                            <span key={oi} className="bg-card border rounded-lg px-2 py-0.5">{o.label}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}

        {/* General Settings */}
        {tab === 'general' && settings && (
          <>
            <h2 className="text-sm font-semibold">Configurações Gerais</h2>

            <div className="rounded-2xl bg-card border p-4 space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Horário de Funcionamento</label>
                <div className="flex gap-2 mt-1">
                  <Input
                    type="time"
                    value={settings.businessHoursStart}
                    onChange={(e) => setSettings({ ...settings, businessHoursStart: e.target.value })}
                    className="h-10 rounded-xl text-sm"
                  />
                  <span className="self-center text-muted-foreground">até</span>
                  <Input
                    type="time"
                    value={settings.businessHoursEnd}
                    onChange={(e) => setSettings({ ...settings, businessHoursEnd: e.target.value })}
                    className="h-10 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">Dias de Atendimento</label>
                <div className="flex gap-1 mt-1">
                  {dayNames.map((d, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        const days = settings.businessDays.includes(i)
                          ? settings.businessDays.filter(x => x !== i)
                          : [...settings.businessDays, i].sort();
                        setSettings({ ...settings, businessDays: days });
                      }}
                      className={cn(
                        'flex-1 py-2 text-xs rounded-lg font-medium transition-colors',
                        settings.businessDays.includes(i) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">Mensagem fora do horário</label>
                <Textarea
                  value={settings.outOfHoursMessage}
                  onChange={(e) => setSettings({ ...settings, outOfHoursMessage: e.target.value })}
                  className="mt-1 text-sm min-h-[80px] rounded-xl"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">Máx. tickets abertos por agente</label>
                <Input
                  type="number"
                  value={settings.maxOpenTicketsPerAgent}
                  onChange={(e) => setSettings({ ...settings, maxOpenTicketsPerAgent: Number(e.target.value) })}
                  className="mt-1 h-10 rounded-xl text-sm w-24"
                />
              </div>

              <Button className="w-full rounded-xl h-10">Salvar Configurações</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

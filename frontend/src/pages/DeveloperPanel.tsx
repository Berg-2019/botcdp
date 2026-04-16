import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/services/api';
import { getSocket } from '@/services/socket';
import { cn } from '@/lib/utils';
import {
  MessageSquareText, FolderTree, Users, Bot, Settings, ChevronRight,
  Plus, Wifi, WifiOff, QrCode, RefreshCw, Trash2, Smartphone,
  BatteryCharging, BatteryMedium, Loader2, CheckCircle2, AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import type { GreetingConfig, BotFlow, SystemUser, GeneralSettings, Queue, WhatsappConnection } from '@/types';

type Tab = 'greetings' | 'queues' | 'users' | 'bot' | 'general';

const tabItems: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: 'greetings', label: 'Saudações', icon: MessageSquareText },
  { key: 'queues', label: 'Setores', icon: FolderTree },
  { key: 'users', label: 'Usuários', icon: Users },
  { key: 'bot', label: 'Bot', icon: Bot },
  { key: 'general', label: 'Geral', icon: Settings },
];

// Mapa visual para cada status de conexão
const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  CONNECTED:    { label: 'Conectado',      color: 'text-green-500',  icon: CheckCircle2 },
  qrcode:       { label: 'Aguardando QR',  color: 'text-amber-500',  icon: QrCode },
  OPENING:      { label: 'Iniciando...',    color: 'text-blue-500',   icon: Loader2 },
  PAIRING:      { label: 'Pareando...',     color: 'text-blue-500',   icon: Loader2 },
  TIMEOUT:      { label: 'Timeout',         color: 'text-red-500',    icon: AlertTriangle },
  DISCONNECTED: { label: 'Desconectado',    color: 'text-gray-400',   icon: WifiOff },
};

// Componente que renderiza a string QR em canvas (a string vinda do Whaileys é texto puro, não data URL)
function QrCanvas({ data }: { data: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !data) return;

    // Importa dinamicamente a lib qrcode para gerar a imagem no canvas
    import('qrcode').then((QRCodeLib) => {
      QRCodeLib.toCanvas(canvasRef.current, data, {
        width: 256,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      }).catch((err: unknown) => console.error('Erro ao gerar QR:', err));
    });
  }, [data]);

  return <canvas ref={canvasRef} className="w-56 h-56" />;
}
export default function DeveloperPanel() {
  const [tab, setTab] = useState<Tab>('greetings');
  const [greetings, setGreetings] = useState<GreetingConfig[]>([]);
  const [queues, setQueues] = useState<Queue[]>([]);
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [botFlows, setBotFlows] = useState<BotFlow[]>([]);
  const [settings, setSettings] = useState<GeneralSettings | null>(null);

  // Estado das conexões WhatsApp
  const [whatsapps, setWhatsapps] = useState<WhatsappConnection[]>([]);
  const [loadingWa, setLoadingWa] = useState(false);
  const [creatingWa, setCreatingWa] = useState(false);
  const [newWaName, setNewWaName] = useState('');

  // Busca geral de dados ao montar o componente
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

  // Busca a lista de conexões WhatsApp
  const fetchWhatsapps = useCallback(async () => {
    try {
      setLoadingWa(true);
      const data = await api.getWhatsapps();
      setWhatsapps(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Erro ao buscar conexões WhatsApp:', err);
    } finally {
      setLoadingWa(false);
    }
  }, []);

  // Carrega conexões ao abrir a aba 'bot'
  useEffect(() => {
    if (tab === 'bot') fetchWhatsapps();
  }, [tab, fetchWhatsapps]);

  // Escuta eventos de sessão WhatsApp via Socket.IO em tempo real
  useEffect(() => {
    if (tab !== 'bot') return;

    const socket = getSocket();

    // O backend emite "whatsappSession" com { action, session }
    const handleSession = (data: { action: string; session: any }) => {
      if (!data?.session) return;
      const updated = data.session as WhatsappConnection;

      setWhatsapps(prev => {
        const idx = prev.findIndex(w => w.id === updated.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = { ...copy[idx], ...updated };
          return copy;
        }
        return [...prev, updated];
      });
    };

    // O backend emite "whatsapp" com { action, whatsapp }
    const handleWhatsapp = (data: { action: string; whatsapp?: any; whatsappId?: number }) => {
      if (data.action === 'delete' && data.whatsappId) {
        setWhatsapps(prev => prev.filter(w => w.id !== data.whatsappId));
      } else if (data.whatsapp) {
        setWhatsapps(prev => {
          const idx = prev.findIndex(w => w.id === data.whatsapp.id);
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = { ...copy[idx], ...data.whatsapp };
            return copy;
          }
          return [...prev, data.whatsapp];
        });
      }
    };

    socket.on('whatsappSession', handleSession);
    socket.on('whatsapp', handleWhatsapp);

    return () => {
      socket.off('whatsappSession', handleSession);
      socket.off('whatsapp', handleWhatsapp);
    };
  }, [tab]);

  // Ações de conexões WhatsApp
  const handleCreateWhatsapp = async () => {
    const name = newWaName.trim() || `BotCDP-${Date.now()}`;
    try {
      setCreatingWa(true);
      const wa = await api.createWhatsapp({ name });
      setWhatsapps(prev => [...prev, wa]);
      setNewWaName('');
    } catch (err) {
      console.error('Erro ao criar conexão:', err);
    } finally {
      setCreatingWa(false);
    }
  };

  const handleStartSession = async (id: number) => {
    try { await api.startWhatsappSession(id); } catch (err) { console.error(err); }
  };

  const handleRestartSession = async (id: number) => {
    try { await api.restartWhatsappSession(id); } catch (err) { console.error(err); }
  };

  const handleDisconnect = async (id: number) => {
    try { await api.disconnectWhatsapp(id); } catch (err) { console.error(err); }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.deleteWhatsapp(id);
      setWhatsapps(prev => prev.filter(w => w.id !== id));
    } catch (err) { console.error(err); }
  };

  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="flex flex-col min-h-screen pb-20">
      <header className="sticky top-0 z-40 bg-card border-b px-4 py-3 safe-top">
        <h1 className="text-xl font-bold">Configurações do Sistema</h1>
        <p className="text-xs text-muted-foreground">Painel Developer</p>
      </header>

      {/* Tab bar - scroll horizontal */}
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
        {/* ==================== SAUDAÇÕES ==================== */}
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

        {/* ==================== SETORES ==================== */}
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

        {/* ==================== USUÁRIOS ==================== */}
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

        {/* ==================== BOT — CONEXÃO + FLUXOS ==================== */}
        {tab === 'bot' && (
          <>
            {/* ---- SEÇÃO 1: Conexões WhatsApp ---- */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wifi className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold">Conexões WhatsApp</h2>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl h-8 text-xs"
                onClick={() => fetchWhatsapps()}
                disabled={loadingWa}
              >
                <RefreshCw className={cn('h-3 w-3 mr-1', loadingWa && 'animate-spin')} />
                Atualizar
              </Button>
            </div>

            {/* Formulário de nova conexão */}
            <div className="rounded-2xl bg-card border p-4 space-y-3">
              <p className="text-xs text-muted-foreground">
                Crie uma nova instância de conexão para parear com o WhatsApp do bot.
              </p>
              <div className="flex gap-2">
                <Input
                  value={newWaName}
                  onChange={(e) => setNewWaName(e.target.value)}
                  placeholder="Nome da conexão (ex: BotCDP Principal)"
                  className="h-9 rounded-xl text-sm flex-1"
                />
                <Button
                  size="sm"
                  className="rounded-xl h-9 text-xs px-4"
                  onClick={handleCreateWhatsapp}
                  disabled={creatingWa}
                >
                  {creatingWa
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <><Plus className="h-3 w-3 mr-1" /> Nova</>
                  }
                </Button>
              </div>
            </div>

            {/* Lista de conexões */}
            {loadingWa && whatsapps.length === 0 && (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}

            {!loadingWa && whatsapps.length === 0 && (
              <div className="rounded-2xl border border-dashed p-8 text-center">
                <Smartphone className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">Nenhuma conexão criada.</p>
                <p className="text-xs text-muted-foreground">Crie uma acima para começar.</p>
              </div>
            )}

            {whatsapps.map((wa) => {
              const st = statusConfig[wa.status] || statusConfig.DISCONNECTED;
              const StIcon = st.icon;
              const isQr = wa.status === 'qrcode' && wa.qrcode;
              const isConnected = wa.status === 'CONNECTED';
              const isLoading = wa.status === 'OPENING' || wa.status === 'PAIRING';

              return (
                <div key={wa.id} className="rounded-2xl bg-card border overflow-hidden">
                  {/* Cabeçalho do card */}
                  <div className="p-4 flex items-center gap-3">
                    <div className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-xl',
                      isConnected ? 'bg-green-500/10' : 'bg-muted'
                    )}>
                      <StIcon className={cn('h-5 w-5', st.color, isLoading && 'animate-spin')} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{wa.name}</p>
                      <div className="flex items-center gap-2 text-xs">
                        <span className={cn('font-medium', st.color)}>{st.label}</span>
                        {wa.isDefault && (
                          <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[10px] font-medium">
                            Padrão
                          </span>
                        )}
                        {isConnected && wa.battery && (
                          <span className="flex items-center gap-0.5 text-muted-foreground">
                            {wa.plugged
                              ? <BatteryCharging className="h-3 w-3" />
                              : <BatteryMedium className="h-3 w-3" />
                            }
                            {wa.battery}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* QR Code renderizado em tempo real */}
                  {isQr && (
                    <div className="px-4 pb-4">
                      <div className="rounded-xl bg-white p-4 flex flex-col items-center gap-3 border">
                        <p className="text-xs text-gray-600 font-medium">
                          📱 Abra o WhatsApp no celular → Configurações → Aparelhos Conectados → Escanear QR Code
                        </p>
                        <QrCanvas data={wa.qrcode} />
                        <p className="text-[10px] text-gray-400">O QR é renovado automaticamente a cada 40s</p>
                      </div>
                    </div>
                  )}

                  {/* Botões de ação */}
                  <div className="border-t px-4 py-3 flex gap-2 flex-wrap">
                    {!isConnected && !isLoading && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl h-8 text-xs"
                        onClick={() => wa.status === 'qrcode' || wa.status === 'TIMEOUT'
                          ? handleRestartSession(wa.id)
                          : handleStartSession(wa.id)
                        }
                      >
                        <QrCode className="h-3 w-3 mr-1" />
                        {wa.status === 'TIMEOUT' ? 'Tentar Novamente' : 'Gerar QR Code'}
                      </Button>
                    )}
                    {isConnected && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl h-8 text-xs text-amber-600 border-amber-200 hover:bg-amber-50"
                        onClick={() => handleDisconnect(wa.id)}
                      >
                        <WifiOff className="h-3 w-3 mr-1" /> Desconectar
                      </Button>
                    )}
                    {isLoading && (
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground px-2">
                        <Loader2 className="h-3 w-3 animate-spin" /> Processando...
                      </span>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="rounded-xl h-8 text-xs text-destructive hover:text-destructive ml-auto"
                      onClick={() => handleDelete(wa.id)}
                    >
                      <Trash2 className="h-3 w-3 mr-1" /> Excluir
                    </Button>
                  </div>
                </div>
              );
            })}

            {/* ---- SEPARADOR ---- */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t" /></div>
              <div className="relative flex justify-center">
                <span className="bg-background px-3 text-xs text-muted-foreground">Fluxos do Bot</span>
              </div>
            </div>

            {/* ---- SEÇÃO 2: Fluxos do Bot (mantida) ---- */}
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

        {/* ==================== GERAL ==================== */}
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

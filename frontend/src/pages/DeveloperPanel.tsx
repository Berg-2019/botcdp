import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { api } from '@/services/api';
import { getSocket } from '@/services/socket';
import { cn } from '@/lib/utils';
import { getReadableErrorMessage } from '@/utils/errorHandler';
import {
  MessageSquareText, FolderTree, Users, Bot, Settings, ChevronRight,
  Plus, Wifi, WifiOff, QrCode, RefreshCw, Trash2, Smartphone,
  BatteryCharging, BatteryMedium, Loader2, CheckCircle2, AlertTriangle, Copy, Check, Edit, Pencil,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { GreetingConfig, BotFlow, SystemUser, GeneralSettings, Queue, WhatsappConnection } from '@/types';
import { BotFlowEditorDialog } from '@/components/BotFlowEditorDialog';

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
  const [showCreateWaDialog, setShowCreateWaDialog] = useState(false);
  const [newWaQueues, setNewWaQueues] = useState<number[]>([]);
  const [newWaGreeting, setNewWaGreeting] = useState('');
  const [showEditWaDialog, setShowEditWaDialog] = useState(false);
  const [editingWa, setEditingWa] = useState<WhatsappConnection | null>(null);
  const [editWaQueues, setEditWaQueues] = useState<number[]>([]);
  const [editWaGreeting, setEditWaGreeting] = useState('');
  const [savingWaEdit, setSavingWaEdit] = useState(false);
  const [availableQueues, setAvailableQueues] = useState<Queue[]>([]);

  // Estado do dialog de criar usuário
  const [showNewUserDialog, setShowNewUserDialog] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [newUserData, setNewUserData] = useState({ name: '', email: '', profile: 'agent' });
  const [userCreatedData, setUserCreatedData] = useState<{ resetLink: string; resetToken: string } | null>(null);
  const [copiedText, setCopiedText] = useState(false);

  // Estado do dialog de editar usuário
  const [showEditUserDialog, setShowEditUserDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(false);
  const [editUserData, setEditUserData] = useState<{ id: number; name: string; email: string; profile: string } | null>(null);

  // Estado do dialog de confirmar remoção
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [deletingUser, setDeletingUser] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ id: number; name: string } | null>(null);

  // --- Estado dos fluxos de bot ---
  // showBotFlowDialog controla abrir/fechar do editor de fluxos.
  // editingBotFlow: null = criar novo, BotFlow = edição do fluxo selecionado.
  // flowToDelete + showDeleteFlowDialog: fluxo pendente de confirmação de remoção.
  const [showBotFlowDialog, setShowBotFlowDialog] = useState(false);
  const [editingBotFlow, setEditingBotFlow] = useState<BotFlow | null>(null);
  const [flowToDelete, setFlowToDelete] = useState<BotFlow | null>(null);
  const [showDeleteFlowDialog, setShowDeleteFlowDialog] = useState(false);
  const [deletingFlow, setDeletingFlow] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [showQueueDialog, setShowQueueDialog] = useState(false);
  const [editingQueue, setEditingQueue] = useState<Queue | null>(null);
  const [savingQueue, setSavingQueue] = useState(false);
  const [queueForm, setQueueForm] = useState({ name: '', color: '#1F77B4', greetingMessage: '' });
  const [showDeleteQueueDialog, setShowDeleteQueueDialog] = useState(false);
  const [queueToDelete, setQueueToDelete] = useState<Queue | null>(null);
  const [deletingQueue, setDeletingQueue] = useState(false);

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

    // O backend emite "botFlow" com { action, botFlow? } ao criar/editar/deletar
    const handleBotFlow = (data: { action: string; botFlow?: BotFlow; flowId?: number }) => {
      if (data.action === 'create' && data.botFlow) {
        setBotFlows(prev => [...prev, data.botFlow!]);
      } else if (data.action === 'update' && data.botFlow) {
        setBotFlows(prev => prev.map(f => f.id === data.botFlow!.id ? data.botFlow! : f));
      } else if (data.action === 'delete' && data.flowId) {
        setBotFlows(prev => prev.filter(f => f.id !== data.flowId));
      }
    };

    socket.on('whatsappSession', handleSession);
    socket.on('whatsapp', handleWhatsapp);
    socket.on('botFlow', handleBotFlow);

    return () => {
      socket.off('whatsappSession', handleSession);
      socket.off('whatsapp', handleWhatsapp);
      socket.off('botFlow', handleBotFlow);
    };
  }, [tab]);

  // Ações de conexões WhatsApp
  const handleCreateWhatsapp = async () => {
    const name = newWaName.trim() || `BotCDP-${Date.now()}`;
    try {
      setCreatingWa(true);
      const wa = await api.createWhatsapp({ 
        name, 
        queueIds: newWaQueues,
        greetingMessage: newWaGreeting || undefined
      });
      setWhatsapps(prev => [...prev, wa]);
      setNewWaName('');
      setNewWaQueues([]);
      setNewWaGreeting('');
      setShowCreateWaDialog(false);
    } catch (err) {
      console.error('Erro ao criar conexão:', err);
      toast.error('Erro ao criar conexão', { description: getReadableErrorMessage(err) });
    } finally {
      setCreatingWa(false);
    }
  };

  const openCreateWaDialog = async () => {
    setShowCreateWaDialog(true);
    try {
      const available = await api.getAvailableQueues();
      setAvailableQueues(available);
    } catch (err) {
      console.error('Erro ao buscar filas disponíveis:', err);
    }
  };

  const toggleQueue = (queueId: number) => {
    setNewWaQueues(prev => 
      prev.includes(queueId) 
        ? prev.filter(id => id !== queueId)
        : [...prev, queueId]
    );
  };

  const openEditWaDialog = async (wa: WhatsappConnection) => {
    setEditingWa(wa);
    setEditWaQueues(wa.queues.map(q => q.id));
    setEditWaGreeting(wa.greetingMessage || '');
    setShowEditWaDialog(true);
  };

  const toggleEditWaQueue = (queueId: number) => {
    setEditWaQueues(prev => 
      prev.includes(queueId) 
        ? prev.filter(id => id !== queueId)
        : [...prev, queueId]
    );
  };

  const handleSaveWaEdit = async () => {
    if (!editingWa) return;
    try {
      setSavingWaEdit(true);
      const updated = await api.updateWhatsapp(editingWa.id, {
        queueIds: editWaQueues,
        greetingMessage: editWaGreeting || undefined,
      });
      setWhatsapps(prev => prev.map(w => w.id === updated.id ? updated : w));
      setShowEditWaDialog(false);
      toast.success('Conexão atualizada!');
    } catch (err) {
      console.error('Erro ao atualizar conexão:', err);
      toast.error('Erro ao atualizar conexão', { description: getReadableErrorMessage(err) });
    } finally {
      setSavingWaEdit(false);
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

  /**
   * Manipulador para criar novo usuário
   * Valida dados, envia para API e aguarda resposta com token de reset
   * 
   * Fluxo:
   * 1. Valida campos obrigatórios (nome e email)
   * 2. Envia requisição para API (POST /api/users)
   * 3. Backend gera senha temporária e token JWT
   * 4. Armazena dados para exibição (link + token)
   * 5. Recarrega lista de usuários
   * 6. Mostra mensagens de sucesso/erro via toast
   */
  const handleCreateUser = async () => {
    // PASSO 1: Validação básica de campos obrigatórios
    const nameTrimmed = newUserData.name.trim();
    const emailTrimmed = newUserData.email.trim();
    
    if (!nameTrimmed || !emailTrimmed) {
      toast.error('Preencha o nome e email para continuar');
      return;
    }

    // PASSO 2: Validação básica de email (formato)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailTrimmed)) {
      toast.error('Por favor, insira um email válido');
      return;
    }

    try {
      setCreatingUser(true);

      // PASSO 3: Envia requisição para criar usuário no backend
      // Backend retorna: user, resetToken, resetLink
      // Nota: Backend verifica se usuário logado é admin
      // Se não for, retorna 403 (Forbidden)
      const response = await api.createUser({
        name: nameTrimmed,
        email: emailTrimmed,
        profile: newUserData.profile,
      });

      // PASSO 4: Sucesso - armazena dados para exibição na tela de sucesso
      setUserCreatedData({ resetLink: response.resetLink, resetToken: response.resetToken });
      
      // PASSO 5: Recarrega lista de usuários para refletir o novo usuário criado
      const usersData = await api.getUsers();
      setUsers(usersData);

      // PASSO 6: Mostra mensagem de sucesso
      toast.success(
        `Usuário "${nameTrimmed}" criado com sucesso! Link de reset foi gerado.`,
        {
          description: 'Você pode copiar o link ou token abaixo para compartilhar com o novo usuário.',
          duration: 5000,
        }
      );

    } catch (err) {
      // PASSO 7: Tratamento de erro - extrai mensagem legível
      console.error('Erro ao criar usuário:', err);
      
      // Extrai a mensagem de erro de forma legível
      const readableError = getReadableErrorMessage(err);
      
      // Mostra toast de erro com mais detalhes
      toast.error('Erro ao criar usuário', {
        description: readableError,
        duration: 6000,
      });

      // Se for erro de permissão, adiciona informação extra
      if (readableError.includes('admin') || readableError.includes('permissão')) {
        console.warn(
          'ℹ️ Dica: Apenas administradores ou desenvolvedores podem criar usuários. '
        );
      }
    } finally {
      setCreatingUser(false);
    }
  };

  /**
   * Copia texto para a área de transferência (clipboard)
   * Mostra feedback visual durante 2 segundos
   */
  const handleCopyToClipboard = (text: string) => {
    // API nativa do navegador para copiar texto
    navigator.clipboard.writeText(text);
    // Feedback visual: muda ícone para "check" por 2 segundos
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  /**
   * Fecha o dialog de criar usuário e reseta os estados
   * Chamado ao clicar "Cancelar" ou "Fechar"
   */
  const handleCloseUserDialog = () => {
    setShowNewUserDialog(false);
    // Limpa formulário
    setNewUserData({ name: '', email: '', profile: 'agent' });
    // Limpa dados de sucesso
    setUserCreatedData(null);
  };

  /**
   * Abre o dialog de editar usuário com os dados pré-preenchidos
   * Comentários em português
   */
  const handleOpenEditDialog = (user: SystemUser) => {
    setEditUserData({
      id: user.id,
      name: user.name,
      email: user.email,
      profile: user.profile,
    });
    setShowEditUserDialog(true);
  };

  /**
   * Atualiza dados do usuário
   * Valida campos, envia para API e atualiza a lista
   * Comentários em português
   */
  const handleEditUser = async () => {
    // PASSO 1: Validação básica de campos obrigatórios
    if (!editUserData || !editUserData.name.trim() || !editUserData.email.trim()) {
      toast.error('Preencha o nome e email para continuar');
      return;
    }

    // PASSO 2: Validação básica de email (formato)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editUserData.email.trim())) {
      toast.error('Por favor, insira um email válido');
      return;
    }

    try {
      setEditingUser(true);

      // PASSO 3: Envia requisição para atualizar usuário
      // Backend valida permissões e atualiza os dados
      await api.updateUser(editUserData.id, {
        name: editUserData.name.trim(),
        email: editUserData.email.trim(),
        profile: editUserData.profile,
      });

      // PASSO 4: Recarrega lista de usuários
      const usersData = await api.getUsers();
      setUsers(usersData);

      // PASSO 5: Fecha dialog e mostra sucesso
      setShowEditUserDialog(false);
      setEditUserData(null);

      toast.success(
        `Usuário "${editUserData.name}" atualizado com sucesso!`,
        {
          duration: 4000,
        }
      );

    } catch (err) {
      // PASSO 6: Tratamento de erro
      console.error('Erro ao atualizar usuário:', err);
      const readableError = getReadableErrorMessage(err);
      
      toast.error('Erro ao atualizar usuário', {
        description: readableError,
        duration: 6000,
      });
    } finally {
      setEditingUser(false);
    }
  };

  /**
   * Fecha o dialog de editar usuário e reseta os estados
   * Comentários em português
   */
  const handleCloseEditDialog = () => {
    setShowEditUserDialog(false);
    setEditUserData(null);
  };

  /**
   * Abre o dialog de confirmação para remover usuário
   * Comentários em português
   */
  const handleOpenDeleteConfirm = (user: SystemUser) => {
    setUserToDelete({ id: user.id, name: user.name });
    setShowDeleteConfirmDialog(true);
  };

  /**
   * Confirma e remove o usuário do sistema
   * Comentários em português
   */
  const handleConfirmDelete = async () => {
    if (!userToDelete) return;

    try {
      setDeletingUser(true);

      // PASSO 1: Envia requisição para remover usuário
      // Backend valida permissões e remove o usuário
      await api.deleteUser(userToDelete.id);

      // PASSO 2: Recarrega lista de usuários
      const usersData = await api.getUsers();
      setUsers(usersData);

      // PASSO 3: Fecha dialog de confirmação e mostra sucesso
      setShowDeleteConfirmDialog(false);
      setUserToDelete(null);

      toast.success(
        `Usuário "${userToDelete.name}" removido com sucesso!`,
        {
          duration: 4000,
        }
      );

    } catch (err) {
      // PASSO 4: Tratamento de erro
      console.error('Erro ao remover usuário:', err);
      const readableError = getReadableErrorMessage(err);
      
      toast.error('Erro ao remover usuário', {
        description: readableError,
        duration: 6000,
      });
    } finally {
      setDeletingUser(false);
    }
  };

  // ==================================================================
  // Handlers de Fluxos de Bot
  // ------------------------------------------------------------------
  // O editor (BotFlowEditorDialog) é usado tanto para criar quanto para
  // editar. Ao salvar, ele retorna o fluxo persistido e chamamos
  // onBotFlowSaved para atualizar a lista local.
  // ==================================================================

  // Abre o editor em modo criação (sem fluxo pré-selecionado).
  const handleOpenNewBotFlow = () => {
    setEditingBotFlow(null);
    setShowBotFlowDialog(true);
  };

  // Abre o editor em modo edição, pré-preenchendo com o fluxo clicado.
  const handleOpenEditBotFlow = (flow: BotFlow) => {
    setEditingBotFlow(flow);
    setShowBotFlowDialog(true);
  };

  // Após salvar (create ou update), recarregamos a lista para refletir
  // steps e IDs reais (o backend recria steps no update, então IDs mudam).
  const handleBotFlowSaved = async () => {
    try {
      const flows = await api.getBotFlows();
      setBotFlows(flows);
    } catch (err) {
      console.error('Erro ao recarregar fluxos do bot:', err);
    }
  };

  // Alterna o campo `enabled` e persiste imediatamente via PUT.
  // Precisamos enviar o payload completo (o backend faz replace dos
  // steps), então reaproveitamos os steps existentes convertendo as
  // referências internas (nextStepId → nextStepIndex).
  const handleToggleBotFlowEnabled = async (flow: BotFlow, nextValid: boolean) => {
    // Atualização otimista na UI.
    setBotFlows((prev) =>
      prev.map((f) => (f.id === flow.id ? { ...f, enabled: nextValid } : f)),
    );

    try {
      // Mapa stepId -> índice, para converter nextStepId em nextStepIndex
      // no payload (o backend recria os steps e recalcula os IDs).
      const idToIndex = new Map<number, number>();
      flow.steps.forEach((s, i) => idToIndex.set(s.id, i));

      await api.updateBotFlow(flow.id, {
        name: flow.name,
        queueId: flow.queueId,
        enabled: nextValid,
        steps: flow.steps.map((s) => ({
          message: s.message,
          options: s.options.map((o) => {
            const out: { label: string; nextStepIndex?: number; queueId?: number } = {
              label: o.label,
            };
            if (typeof o.queueId === 'number') out.queueId = o.queueId;
            else if (typeof o.nextStepId === 'number' && idToIndex.has(o.nextStepId)) {
              out.nextStepIndex = idToIndex.get(o.nextStepId)!;
            }
            return out;
          }),
        })),
      });
      // Recarrega para sincronizar IDs dos steps após o replace do backend.
      const flows = await api.getBotFlows();
      setBotFlows(flows);
    } catch (err) {
      // Reverte UI em caso de erro.
      setBotFlows((prev) =>
        prev.map((f) => (f.id === flow.id ? { ...f, enabled: !nextValid } : f)),
      );
      toast.error('Erro ao atualizar fluxo', {
        description: getReadableErrorMessage(err),
      });
    }
  };

  // Abre o dialog de confirmação de remoção.
  const handleAskDeleteBotFlow = (flow: BotFlow) => {
    setFlowToDelete(flow);
    setShowDeleteFlowDialog(true);
  };

  // Confirma a remoção e recarrega a lista.
  const handleConfirmDeleteBotFlow = async () => {
    if (!flowToDelete) return;
    try {
      setDeletingFlow(true);
      await api.deleteBotFlow(flowToDelete.id);
      const flows = await api.getBotFlows();
      setBotFlows(flows);
      toast.success(`Fluxo "${flowToDelete.name}" removido.`);
      setShowDeleteFlowDialog(false);
      setFlowToDelete(null);
    } catch (err) {
      toast.error('Erro ao remover fluxo', {
        description: getReadableErrorMessage(err),
      });
    } finally {
      setDeletingFlow(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSavingSettings(true);
      await api.updateGeneralSettings(settings);
      toast.success('Configurações salvas com sucesso!');
    } catch (err) {
      console.error('Erro ao salvar configurações:', err);
      toast.error('Erro ao salvar configurações', { description: getReadableErrorMessage(err) });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleOpenQueueDialog = (queue?: Queue) => {
    if (queue) {
      setEditingQueue(queue);
      setQueueForm({ name: queue.name, color: queue.color, greetingMessage: queue.greetingMessage || '' });
    } else {
      setEditingQueue(null);
      setQueueForm({ name: '', color: '#1F77B4', greetingMessage: '' });
    }
    setShowQueueDialog(true);
  };

  const handleSaveQueue = async () => {
    if (!queueForm.name.trim()) {
      toast.error('Digite o nome do setor');
      return;
    }
    try {
      setSavingQueue(true);
      if (editingQueue) {
        await api.updateQueue(editingQueue.id, queueForm);
        toast.success('Setor atualizado!');
      } else {
        await api.createQueue(queueForm);
        toast.success('Setor criado!');
      }
      const queuesData = await api.getQueues();
      setQueues(queuesData);
      setShowQueueDialog(false);
    } catch (err) {
      console.error('Erro ao salvar setor:', err);
      toast.error('Erro ao salvar setor', { description: getReadableErrorMessage(err) });
    } finally {
      setSavingQueue(false);
    }
  };

  const handleDeleteQueue = async () => {
    if (!queueToDelete) return;
    try {
      setDeletingQueue(true);
      await api.deleteQueue(queueToDelete.id);
      const queuesData = await api.getQueues();
      setQueues(queuesData);
      setShowDeleteQueueDialog(false);
      setQueueToDelete(null);
      toast.success('Setor removido!');
    } catch (err) {
      console.error('Erro ao remover setor:', err);
      toast.error('Erro ao remover setor', { description: getReadableErrorMessage(err) });
    } finally {
      setDeletingQueue(false);
    }
  };

  const handleSaveGreeting = async (queueId: number, message: string, enabled: boolean) => {
    try {
      await api.updateGreeting(queueId, { message, enabled });
      toast.success('Saudação salva!');
      const greetingsData = await api.getGreetings();
      setGreetings(greetingsData);
    } catch (err) {
      console.error('Erro ao salvar saudação:', err);
      toast.error('Erro ao salvar saudação', { description: getReadableErrorMessage(err) });
    }
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
            </div>
            {greetings.map((g) => (
              <div key={g.id} className="rounded-2xl bg-card border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{g.queueName}</span>
                  <div className="flex items-center gap-2">
                    <Switch checked={g.enabled} onCheckedChange={(v) => {
                      setGreetings(prev => prev.map(x => x.id === g.id ? { ...x, enabled: v } : x));
                    }} />
                    <Button size="sm" variant="outline" className="rounded-xl h-8 text-xs" onClick={() => handleSaveGreeting(g.id, g.message, g.enabled)}>
                      Salvar
                    </Button>
                  </div>
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
              <Button size="sm" variant="outline" className="rounded-xl h-8 text-xs" onClick={() => { setEditingQueue(null); setShowQueueDialog(true); }}>
                <Plus className="h-3 w-3 mr-1" /> Novo Setor
              </Button>
            </div>
            {queues.map((q) => (
              <div key={q.id} className="rounded-2xl bg-card border p-4 flex items-center gap-3">
                <div className="h-4 w-4 rounded-full" style={{ backgroundColor: q.color }} />
                <span className="text-sm font-medium flex-1">{q.name}</span>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditingQueue(q); setShowQueueDialog(true); }} title="Editar setor">
                  <Edit className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => { setQueueToDelete(q); setShowDeleteQueueDialog(true); }} title="Remover setor">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </>
        )}

        {/* ==================== USUÁRIOS ==================== */}
        {tab === 'users' && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Usuários</h2>
              <Button 
                size="sm" 
                variant="outline" 
                className="rounded-xl h-8 text-xs"
                onClick={() => setShowNewUserDialog(true)}
              >
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
                {/* Botões de ação: Editar e Remover */}
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0 rounded-lg"
                    onClick={() => handleOpenEditDialog(u)}
                    title="Editar usuário"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-8 w-8 p-0 rounded-lg"
                    onClick={() => handleOpenDeleteConfirm(u)}
                    title="Remover usuário"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
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

            {/* Botão para criar nova conexão */}
            <div className="rounded-2xl bg-card border p-4">
              <p className="text-xs text-muted-foreground mb-3">
                Crie uma nova instância de conexão para parear com o WhatsApp do bot.
              </p>
              <Button
                size="sm"
                className="rounded-xl h-9 text-xs"
                onClick={openCreateWaDialog}
              >
                <Plus className="h-3 w-3 mr-1" /> Nova Conexão
              </Button>
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
                    <div className="ml-auto flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="rounded-xl h-8 text-xs text-muted-foreground hover:text-primary"
                        onClick={() => openEditWaDialog(wa)}
                      >
                        <Pencil className="h-3 w-3 mr-1" /> Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="rounded-xl h-8 text-xs text-destructive hover:text-destructive"
                        onClick={() => handleDelete(wa.id)}
                      >
                        <Trash2 className="h-3 w-3 mr-1" /> Excluir
                      </Button>
                    </div>
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

            {/* ---- SEÇÃO 2: Fluxos do Bot ---- */}
            {/*
              Cada card representa um BotFlow. O usuário pode:
              - Criar um novo fluxo (botão "Novo Fluxo" abre o editor em modo criação)
              - Editar um fluxo existente (botão de lápis abre o editor já preenchido)
              - Ativar/desativar via Switch (persiste imediatamente via PUT)
              - Remover um fluxo (botão lixeira abre confirmação)
            */}
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Fluxos do Bot</h2>
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl h-8 text-xs"
                onClick={handleOpenNewBotFlow}
              >
                <Plus className="h-3 w-3 mr-1" /> Novo Fluxo
              </Button>
            </div>

            {botFlows.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">
                Nenhum fluxo configurado ainda. Clique em "Novo Fluxo" para criar o primeiro.
              </p>
            )}

            {botFlows.map((f) => (
              <div key={f.id} className="rounded-2xl bg-card border p-4 space-y-3">
                {/* Cabeçalho do card: nome/fila + toggle + ações */}
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{f.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {f.queueName} · {f.steps.length} etapas
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch
                      checked={f.enabled}
                      onCheckedChange={(v) => handleToggleBotFlowEnabled(f, v)}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => handleOpenEditBotFlow(f)}
                      title="Editar fluxo"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleAskDeleteBotFlow(f)}
                      title="Remover fluxo"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Preview das etapas do fluxo (somente leitura no painel) */}
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

              <Button className="w-full rounded-xl h-10" onClick={handleSaveSettings} disabled={savingSettings}>
                {savingSettings ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {savingSettings ? 'Salvando...' : 'Salvar Configurações'}
              </Button>
            </div>
          </>
        )}
      </div>

      {/* 
        Dialog Modal para Criar Novo Usuário
        Funciona em dois estágios:
        1. Estágio 1: Formulário de entrada (name, email, profile)
        2. Estágio 2: Tela de sucesso (mostra link e token)
      */}
      <Dialog open={showNewUserDialog} onOpenChange={setShowNewUserDialog}>
        <DialogContent className="rounded-3xl max-w-sm">
          <DialogHeader>
            <DialogTitle>Criar Novo Usuário</DialogTitle>
            <DialogDescription>
              {/* Alterna mensagem conforme o estágio */}
              {userCreatedData 
                ? 'Usuário criado com sucesso! Envie o link de reset de senha para o usuário.'
                : 'Preencha os dados para criar um novo usuário no sistema'}
            </DialogDescription>
          </DialogHeader>

          {/* ESTÁGIO 1: Formulário de criação */}
          {!userCreatedData ? (
            <>
              <div className="space-y-4">
                {/* Campo: Nome do Usuário */}
                <div>
                  <label className="text-sm font-medium">Nome</label>
                  <Input
                    value={newUserData.name}
                    onChange={(e) => setNewUserData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Digite o nome"
                    className="rounded-xl mt-1"
                  />
                </div>

                {/* Campo: Email do Usuário */}
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    type="email"
                    value={newUserData.email}
                    onChange={(e) => setNewUserData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="usuario@empresa.com"
                    className="rounded-xl mt-1"
                  />
                </div>

                {/* Campo: Perfil/Cargo do Usuário */}
                <div>
                  <label className="text-sm font-medium">Perfil</label>
                  <Select value={newUserData.profile} onValueChange={(value) => setNewUserData(prev => ({ ...prev, profile: value }))}>
                    <SelectTrigger className="rounded-xl mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="agent">Agente</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="developer">Developer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Botões de ação: Cancelar / Criar */}
              <DialogFooter>
                <Button variant="outline" onClick={handleCloseUserDialog}>Cancelar</Button>
                <Button onClick={handleCreateUser} disabled={creatingUser}>
                  {creatingUser ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {creatingUser ? 'Criando...' : 'Criar Usuário'}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              {/* ESTÁGIO 2: Resultado de sucesso com link e token */}
              <div className="space-y-4">
                {/* Mensagem de sucesso */}
                <div className="rounded-lg bg-green-50 border border-green-200 p-3">
                  <p className="text-sm text-green-700 font-medium flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Usuário criado com sucesso!
                  </p>
                </div>

                {/* Campo: Link de Reset de Senha (com botão copiar) */}
                <div>
                  <label className="text-sm font-medium">Link de Reset de Senha</label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={userCreatedData.resetLink}
                      readOnly
                      className="rounded-xl text-xs bg-muted"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl h-10"
                      onClick={() => handleCopyToClipboard(userCreatedData.resetLink)}
                    >
                      {/* Ícone muda conforme clicou no botão: Copy → Check */}
                      {copiedText ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Copie e compartilhe este link com o novo usuário para que ele possa definir sua senha.
                  </p>
                </div>

                {/* Campo: Token Alternativo (backup se o link não funcionar) */}
                <div>
                  <label className="text-sm font-medium">Token (alternativo)</label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={userCreatedData.resetToken}
                      readOnly
                      className="rounded-xl text-xs bg-muted"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl h-10"
                      onClick={() => handleCopyToClipboard(userCreatedData.resetToken)}
                    >
                      {copiedText ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Código alternativo para o usuário usar se preferir.
                  </p>
                </div>
              </div>

              {/* Botão: Fechar Dialog */}
              <DialogFooter>
                <Button className="w-full rounded-xl" onClick={handleCloseUserDialog}>Fechar</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ==================== DIALOG: EDITAR USUÁRIO ==================== */}
      <Dialog open={showEditUserDialog} onOpenChange={setShowEditUserDialog}>
        <DialogContent className="rounded-3xl max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>
              Atualize os dados do usuário no sistema
            </DialogDescription>
          </DialogHeader>

          {editUserData && (
            <>
              <div className="space-y-4">
                {/* Campo: Nome do Usuário */}
                <div>
                  <label className="text-sm font-medium">Nome</label>
                  <Input
                    value={editUserData.name}
                    onChange={(e) => setEditUserData(prev => prev ? { ...prev, name: e.target.value } : null)}
                    placeholder="Digite o nome"
                    className="rounded-xl mt-1"
                  />
                </div>

                {/* Campo: Email do Usuário */}
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    type="email"
                    value={editUserData.email}
                    onChange={(e) => setEditUserData(prev => prev ? { ...prev, email: e.target.value } : null)}
                    placeholder="usuario@empresa.com"
                    className="rounded-xl mt-1"
                  />
                </div>

                {/* Campo: Perfil/Cargo do Usuário */}
                <div>
                  <label className="text-sm font-medium">Perfil</label>
                  <Select value={editUserData.profile} onValueChange={(value) => setEditUserData(prev => prev ? { ...prev, profile: value } : null)}>
                    <SelectTrigger className="rounded-xl mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="agent">Agente</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="developer">Developer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Botões de ação: Cancelar / Atualizar */}
              <DialogFooter>
                <Button variant="outline" onClick={handleCloseEditDialog}>Cancelar</Button>
                <Button onClick={handleEditUser} disabled={editingUser}>
                  {editingUser ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {editingUser ? 'Atualizando...' : 'Atualizar'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ==================== DIALOG: EDITOR DE FLUXO DO BOT ==================== */}
      {/*
        Centraliza criação e edição de BotFlow. Quando `editingBotFlow`
        é null, o dialog age como criação. Após salvar, o callback
        handleBotFlowSaved recarrega a lista local para refletir IDs de
        steps atualizados pelo backend.
      */}
      <BotFlowEditorDialog
        open={showBotFlowDialog}
        onOpenChange={setShowBotFlowDialog}
        flow={editingBotFlow}
        queues={queues}
        onSaved={handleBotFlowSaved}
      />

      {/* ==================== DIALOG: CONFIRMAR REMOÇÃO DE FLUXO ==================== */}
      <Dialog open={showDeleteFlowDialog} onOpenChange={setShowDeleteFlowDialog}>
        <DialogContent className="rounded-3xl max-w-sm">
          <DialogHeader>
            <DialogTitle>Remover Fluxo</DialogTitle>
            <DialogDescription>
              Esta ação é irreversível. O fluxo e todas as suas etapas serão apagados.
            </DialogDescription>
          </DialogHeader>
          {flowToDelete && (
            <>
              <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                <p className="text-sm text-red-700 font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Fluxo: <span className="font-semibold">{flowToDelete.name}</span>
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDeleteFlowDialog(false)}>Cancelar</Button>
                <Button
                  variant="destructive"
                  onClick={handleConfirmDeleteBotFlow}
                  disabled={deletingFlow}
                >
                  {deletingFlow ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {deletingFlow ? 'Removendo...' : 'Remover Fluxo'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ==================== DIALOG: CONFIRMAR REMOÇÃO ==================== */}
      <Dialog open={showDeleteConfirmDialog} onOpenChange={setShowDeleteConfirmDialog}>
        <DialogContent className="rounded-3xl max-w-sm">
          <DialogHeader>
            <DialogTitle>Remover Usuário</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover este usuário do sistema?
            </DialogDescription>
          </DialogHeader>

          {userToDelete && (
            <>
              {/* Alerta de confirmação */}
              <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                <p className="text-sm text-red-700 font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Usuário: <span className="font-semibold">{userToDelete.name}</span>
                </p>
              </div>

              {/* Mensagem de aviso */}
              <div className="text-sm text-muted-foreground">
                <p>Esta ação não pode ser desfeita. O usuário será permanentemente removido do sistema.</p>
              </div>

              {/* Botões de ação: Cancelar / Confirmar Remoção */}
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDeleteConfirmDialog(false)}>Cancelar</Button>
                <Button
                  variant="destructive"
                  onClick={handleConfirmDelete}
                  disabled={deletingUser}
                >
                  {deletingUser ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {deletingUser ? 'Removendo...' : 'Remover Usuário'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ==================== DIALOG: CRIAR CONEXÃO WHATSAPP ==================== */}
      <Dialog open={showCreateWaDialog} onOpenChange={setShowCreateWaDialog}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Conexão WhatsApp</DialogTitle>
            <DialogDescription>
              Configure a conexão e associe os setores que serão atendidos por estebot.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Nome da conexão */}
            <div>
              <Label className="text-sm font-medium">Nome da conexão</Label>
              <Input
                value={newWaName}
                onChange={(e) => setNewWaName(e.target.value)}
                placeholder="Ex: BotCDP Principal"
                className="rounded-xl mt-1"
              />
            </div>

            {/* Seleção de setores */}
            <div>
              <Label className="text-sm font-medium">Setores associados</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Selecione os setores que serão atendidos por esta conexão. Uma setor não pode estar em mais de uma conexão.
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto rounded-xl border p-2">
                {queues.map((queue) => {
                  const isUsed = whatsapps.some(wa => wa.queues.some(q => q.id === queue.id));
                  const isSelected = newWaQueues.includes(queue.id);
                  return (
                    <div
                      key={queue.id}
                      className={cn(
                        "flex items-center gap-2 rounded-lg p-2 text-sm",
                        isUsed && !isSelected && "opacity-50"
                      )}
                    >
                      <Checkbox
                        id={`queue-${queue.id}`}
                        checked={isSelected}
                        disabled={isUsed && !isSelected}
                        onCheckedChange={() => toggleQueue(queue.id)}
                      />
                      <Label
                        htmlFor={`queue-${queue.id}`}
                        className={cn(
                          "flex-1 cursor-pointer font-normal",
                          isUsed && !isSelected && "text-muted-foreground line-through"
                        )}
                      >
                        {queue.name}
                      </Label>
                      {isUsed && !isSelected && (
                        <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                          Em uso
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mensagem de saudação (obrigatório se 2+ setores) */}
            {newWaQueues.length >= 2 && (
              <div>
                <Label className="text-sm font-medium">Mensagem de saudação</Label>
                <p className="text-xs text-muted-foreground mb-1">
                  Esta mensagem será mostrada antes do menu de escolha de setor.
                </p>
                <Textarea
                  value={newWaGreeting}
                  onChange={(e) => setNewWaGreeting(e.target.value)}
                  placeholder="Ex: Olá! Bem-vindo ao BotCDP. Como podemos ajudar?"
                  className="rounded-xl text-sm"
                  rows={2}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateWaDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreateWhatsapp}
              disabled={creatingWa || (newWaQueues.length >= 2 && !newWaGreeting.trim())}
            >
              {creatingWa ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {creatingWa ? 'Criando...' : 'Criar Conexão'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== DIALOG: EDITAR CONEXÃO WHATSAPP ==================== */}
      <Dialog open={showEditWaDialog} onOpenChange={setShowEditWaDialog}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Conexão WhatsApp</DialogTitle>
            <DialogDescription>
              Atualize os setores e a mensagem de saudação desta conexão.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Nome da conexão (somente leitura) */}
            <div>
              <Label className="text-sm font-medium">Nome da conexão</Label>
              <Input
                value={editingWa?.name || ''}
                disabled
                className="rounded-xl mt-1 bg-muted"
              />
            </div>

            {/* Seleção de setores */}
            <div>
              <Label className="text-sm font-medium">Setores associados</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Selecione os setores que serão atendidos por esta conexão. Uma setor não pode estar em mais de uma conexão.
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto rounded-xl border p-2">
                {queues.map((queue) => {
                  const isUsed = whatsapps.some(wa => wa.queues.some(q => q.id === queue.id) && wa.id !== editingWa?.id);
                  const isSelected = editWaQueues.includes(queue.id);
                  return (
                    <div
                      key={queue.id}
                      className={cn(
                        "flex items-center gap-2 rounded-lg p-2 text-sm",
                        isUsed && !isSelected && "opacity-50"
                      )}
                    >
                      <Checkbox
                        id={`edit-queue-${queue.id}`}
                        checked={isSelected}
                        disabled={isUsed && !isSelected}
                        onCheckedChange={() => toggleEditWaQueue(queue.id)}
                      />
                      <Label
                        htmlFor={`edit-queue-${queue.id}`}
                        className={cn(
                          "flex-1 cursor-pointer font-normal",
                          isUsed && !isSelected && "text-muted-foreground line-through"
                        )}
                      >
                        {queue.name}
                      </Label>
                      {isUsed && !isSelected && (
                        <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                          Em uso
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mensagem de saudação (obrigatório se 2+ setores) */}
            {editWaQueues.length >= 2 && (
              <div>
                <Label className="text-sm font-medium">Mensagem de saudação</Label>
                <p className="text-xs text-muted-foreground mb-1">
                  Esta mensagem será mostrada antes do menu de escolha de setor.
                </p>
                <Textarea
                  value={editWaGreeting}
                  onChange={(e) => setEditWaGreeting(e.target.value)}
                  placeholder="Ex: Olá! Bem-vindo ao BotCDP. Como podemos ajudar?"
                  className="rounded-xl text-sm"
                  rows={2}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditWaDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveWaEdit}
              disabled={savingWaEdit || (editWaQueues.length >= 2 && !editWaGreeting.trim())}
            >
              {savingWaEdit ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {savingWaEdit ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== DIALOG: CRIAR/EDITAR SETOR ==================== */}
      <Dialog open={showQueueDialog} onOpenChange={setShowQueueDialog}>
        <DialogContent className="rounded-3xl max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingQueue ? 'Editar Setor' : 'Novo Setor'}</DialogTitle>
            <DialogDescription>
              Configure o nome, cor e mensagem de saudação do setor.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Nome do setor</Label>
              <Input
                value={queueForm.name}
                onChange={(e) => setQueueForm({ ...queueForm, name: e.target.value })}
                placeholder="Ex: Financeiro"
                className="rounded-xl mt-1"
              />
            </div>

            <div>
              <Label className="text-sm font-medium">Cor</Label>
              <div className="flex gap-2 mt-1 items-center">
                <Input
                  type="color"
                  value={queueForm.color}
                  onChange={(e) => setQueueForm({ ...queueForm, color: e.target.value })}
                  className="h-10 w-14 rounded-xl p-1"
                />
                <Input
                  value={queueForm.color}
                  onChange={(e) => setQueueForm({ ...queueForm, color: e.target.value })}
                  placeholder="#1F77B4"
                  className="rounded-xl flex-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Mensagem de saudação</Label>
              <Textarea
                value={queueForm.greetingMessage}
                onChange={(e) => setQueueForm({ ...queueForm, greetingMessage: e.target.value })}
                placeholder="Mensagem enviada automaticamente quando cliente for para este setor"
                className="rounded-xl mt-1"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQueueDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveQueue} disabled={savingQueue}>
              {savingQueue ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {savingQueue ? 'Salvando...' : editingQueue ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== DIALOG: CONFIRMAR REMOÇÃO DE SETOR ==================== */}
      <Dialog open={showDeleteQueueDialog} onOpenChange={setShowDeleteQueueDialog}>
        <DialogContent className="rounded-3xl max-w-sm">
          <DialogHeader>
            <DialogTitle>Remover Setor</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover este setor? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>

          {queueToDelete && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3">
              <p className="text-sm text-red-700 font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Setor: <span className="font-semibold">{queueToDelete.name}</span>
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteQueueDialog(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteQueue} disabled={deletingQueue}>
              {deletingQueue ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {deletingQueue ? 'Removendo...' : 'Remover'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

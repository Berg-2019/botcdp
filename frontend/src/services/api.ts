import type { User, Ticket, Message, QuickAnswer, Queue, Contact, DashboardStats, TicketsByQueue, AgentPerformance, VolumeByPeriod, SLAByQueue, GreetingConfig, BotFlow, SystemUser, GeneralSettings, WhatsappConnection } from '@/types';

const buildUrl = import.meta.env.VITE_API_URL || '';
const cachedApiUrl = localStorage.getItem('api_url') || '';
const isLocalhost = (url: string) => /localhost|127\.0\.0\.1/.test(url);
// Em produção (buildUrl aponta para domínio real), ignora cache de localhost
const API_URL = (!isLocalhost(cachedApiUrl) && cachedApiUrl)
  ? cachedApiUrl
  : buildUrl || cachedApiUrl || 'http://localhost:8080';

function headers(): HeadersInit {
  return {
    'Content-Type': 'application/json',
  };
}

let isRefreshing = false;
let refreshPromise: Promise<User | null> | null = null;

/**
 * Tenta renovar a sessão usando o refresh token (cookie httpOnly `jrt`).
 * O backend responde com Set-Cookie renovando o `access_token` httpOnly
 * automaticamente — o frontend nunca lê ou guarda o token em si.
 */
async function tryRefreshToken(): Promise<User | null> {
  if (isRefreshing && refreshPromise) return refreshPromise;

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const baseUrl = API_URL;
      const res = await fetch(`${baseUrl}/api/auth/refresh_token`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
        return data.user as User;
      }
      return null;
    } catch {
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const baseUrl = API_URL;
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    credentials: 'include',
    headers: { ...headers(), ...options?.headers },
  });

  // Se o access_token expirou (401/403), tenta renovar a sessão antes de deslogar
  if (res.status === 401 || res.status === 403) {
    const refreshedUser = await tryRefreshToken();
    if (refreshedUser) {
      // Refaz a requisição original; o novo cookie já foi setado pelo browser
      const retryRes = await fetch(`${baseUrl}${path}`, {
        ...options,
        credentials: 'include',
        headers: { ...headers(), ...options?.headers },
      });
      if (retryRes.ok) return retryRes.json();
    }
    // Se o refresh também falhou, desloga
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('Unauthorized or Forbidden');
  }

  if (!res.ok) {
    const text = await res.text();
    let message = text;
    try {
      const data = JSON.parse(text);
      if (data?.error) message = data.error;
    } catch {
      // Corpo não é JSON (ex.: erro HTML do proxy) — mantém o texto cru.
    }
    const error = new Error(message || 'Erro inesperado') as Error & { status?: number };
    error.status = res.status;
    throw error;
  }
  return res.json();
}

export const api = {
  setBaseUrl(url: string) {
    localStorage.setItem('api_url', url);
  },

  getBaseUrl() {
    return API_URL;
  },

  // Aceita tanto número de WhatsApp (login padrão atual) quanto email
  // (contas legadas que ainda não migraram para phone).
  async login(identifier: string, password: string): Promise<User> {
    const isEmail = identifier.includes('@');
    const data = await request<{ user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(
        isEmail ? { email: identifier, password } : { phone: identifier, password }
      ),
    });
    localStorage.setItem('user', JSON.stringify(data.user));
    return data.user;
  },

  async logout() {
    try {
      await request('/api/auth/logout', { method: 'DELETE' });
    } finally {
      localStorage.removeItem('user');
    }
  },

  // Revalida a sessão a partir do cookie httpOnly `jrt` (chamado no boot do app,
  // já que o frontend não tem como ler o access_token diretamente).
  async checkSession(): Promise<User | null> {
    return tryRefreshToken();
  },

  getUser(): User | null {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  },

  async getTickets(params: { status: string; queueIds?: number[]; searchParam?: string }): Promise<{ tickets: Ticket[]; count: number }> {
    const query = new URLSearchParams({ status: params.status, showAll: 'false' });
    if (params.queueIds?.length) query.set('queueIds', JSON.stringify(params.queueIds));
    if (params.searchParam) query.set('searchParam', params.searchParam);
    return request(`/api/tickets?${query}`);
  },

  async getTicket(id: number): Promise<Ticket> {
    return request(`/api/tickets/${id}`);
  },

  async updateTicket(id: number, data: Partial<Ticket>): Promise<Ticket> {
    return request(`/api/tickets/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },

  async getMessages(ticketId: number, page = 1): Promise<{ messages: Message[]; count: number }> {
    return request(`/api/messages/${ticketId}?pageNumber=${page}`);
  },

  async sendMessage(ticketId: number, body: string): Promise<Message> {
    return request(`/api/messages/${ticketId}`, {
      method: 'POST',
      body: JSON.stringify({ body, fromMe: true }),
    });
  },

  async sendMedia(ticketId: number, file: File | Blob, caption = ''): Promise<Message> {
    const baseUrl = API_URL;
    const formData = new FormData();
    const fileName = file instanceof File ? file.name : `audio_${Date.now()}.webm`;
    formData.append('medias', file, fileName);
    formData.append('body', caption);
    formData.append('fromMe', 'true');
    const res = await fetch(`${baseUrl}/api/messages/${ticketId}`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getQuickAnswers(search = ''): Promise<QuickAnswer[]> {
    const query = search ? `?searchParam=${encodeURIComponent(search)}` : '';
    return request(`/api/quickAnswers${query}`);
  },

  async createQuickAnswer(data: { shortcut: string; message: string }): Promise<QuickAnswer> {
    return request('/api/quickAnswers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateQuickAnswer(quickAnswerId: number, data: { shortcut?: string; message?: string }): Promise<QuickAnswer> {
    return request(`/api/quickAnswers/${quickAnswerId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteQuickAnswer(quickAnswerId: number): Promise<{ message: string }> {
    return request(`/api/quickAnswers/${quickAnswerId}`, {
      method: 'DELETE',
    });
  },

  async getQueues(): Promise<Queue[]> {
    return request('/api/queue');
  },

  async getAvailableQueues(): Promise<Queue[]> {
    return request('/api/queue/available');
  },

  async createQueue(data: { name: string; color: string; greetingMessage?: string }): Promise<Queue> {
    return request('/api/queue', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateQueue(queueId: number, data: { name?: string; color?: string; greetingMessage?: string }): Promise<Queue> {
    return request(`/api/queue/${queueId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteQueue(queueId: number): Promise<{ message: string }> {
    return request(`/api/queue/${queueId}`, {
      method: 'DELETE',
    });
  },

  async updateGreeting(queueId: number, data: { message: string; enabled: boolean }): Promise<GreetingConfig> {
    return request(`/api/greetings/${queueId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async transferTicket(ticketId: number, queueId: number, userId?: number): Promise<Ticket> {
    return request(`/api/tickets/${ticketId}`, {
      method: 'PUT',
      body: JSON.stringify({ queueId, userId, status: 'pending' }),
    });
  },

  async getContacts(search?: string): Promise<Contact[]> {
    const query = search ? `?searchParam=${encodeURIComponent(search)}` : '';
    const data = await request<{ contacts: Contact[] }>(`/api/contacts${query}`);
    return data.contacts || [];
  },

  async saveContact(contactId: number): Promise<void> {
    await request(`/api/contacts/${contactId}/save`, { method: 'POST' });
  },

  // --- Admin Dashboard ---

  async getDashboardStats(): Promise<DashboardStats> {
    return request('/api/dashboard/stats');
  },

  async getTicketsByQueue(): Promise<TicketsByQueue[]> {
    return request('/api/dashboard/tickets-by-queue');
  },

  async getAgentPerformance(): Promise<AgentPerformance[]> {
    return request('/api/dashboard/agent-performance');
  },

  async getVolumeByPeriod(): Promise<VolumeByPeriod[]> {
    return request('/api/dashboard/volume');
  },

  async getSLAByQueue(): Promise<SLAByQueue[]> {
    return request('/api/dashboard/sla');
  },

  // --- Developer Panel ---

  async getGreetings(): Promise<GreetingConfig[]> {
    return request('/api/greetings');
  },

  async getUsers(): Promise<SystemUser[]> {
    const data = await request<{ users: SystemUser[]; count: number }>('/api/users');
    return (data.users || []).map(u => ({ ...u, enabled: true }));
  },

  // Cria um novo usuário no sistema (apenas admin)
  // Backend gera automaticamente uma senha temporária e um token de reset,
  // e tenta enviar o link de definição de senha via WhatsApp para `phone`.
  // Retorna: user, resetToken (JWT), resetLink, whatsappSent/whatsappError
  async createUser(data: { name: string; phone: string; email?: string; profile: string; queueIds?: number[] }): Promise<{ user: SystemUser; resetToken: string; resetLink: string; whatsappSent?: boolean; whatsappError?: string }> {
    return request('/api/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Redefine a senha do usuário usando um token JWT válido
  // Chamado pela página de /set-password após usuário definir sua nova senha
  // Validações: token válido, não expirado, email corresponde
  async setPassword(data: { token: string; password: string }): Promise<{ message: string }> {
    return request('/api/auth/set-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Troca de senha de um usuário já autenticado (usado no gate de
  // mustChangePassword). O backend encerra a sessão atual após a troca,
  // por isso o chamador deve redirecionar para /login em seguida.
  async changePassword(data: { currentPassword: string; newPassword: string }): Promise<{ message: string }> {
    return request('/api/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Atualiza dados de um usuário existente
  // Campos atualizáveis: name, email, profile
  // Comentários em português
  async updateUser(userId: number, data: { name?: string; email?: string; profile?: string; queueIds?: number[] }): Promise<SystemUser> {
    return request(`/api/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Remove um usuário do sistema
  // Comentários em português
  async deleteUser(userId: number): Promise<{ message: string }> {
    return request(`/api/users/${userId}`, {
      method: 'DELETE',
    });
  },

  // ============================================================
  // Fluxos do Bot (BotFlow / BotStep)
  // ------------------------------------------------------------
  // Um BotFlow é vinculado a uma fila (queueId) e contém uma lista
  // ordenada de BotSteps. Cada step tem uma mensagem e opções; cada
  // opção aponta para outro step (nextStepId) ou transfere o ticket
  // para outra fila (queueId). O backend executa o fluxo em
  // ExecuteBotFlowService quando o ticket já tem fila e ainda não
  // tem atendente humano atribuído.
  // ============================================================

  async getBotFlows(): Promise<BotFlow[]> {
    return request('/api/bot-flows');
  },

  // Cria um novo fluxo com seus steps/options em uma única chamada.
  // O backend criará os steps na ordem do array e persistirá options
  // como JSON em cada step.
  async createBotFlow(data: {
    name: string;
    queueId: number;
    enabled: boolean;
    steps: { message: string; options: { label: string; nextStepId?: number; queueId?: number }[] }[];
  }): Promise<BotFlow> {
    return request('/api/bot-flows', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Atualiza nome/fila/enabled e substitui completamente os steps
  // existentes. O backend apaga os steps antigos e recria pela nova
  // lista — portanto IDs de steps mudam após update.
  async updateBotFlow(
    flowId: number,
    data: {
      name: string;
      queueId: number;
      enabled: boolean;
      steps: { message: string; options: { label: string; nextStepId?: number; queueId?: number }[] }[];
    }
  ): Promise<BotFlow> {
    return request(`/api/bot-flows/${flowId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Remove o fluxo (e, por cascata, seus steps).
  async deleteBotFlow(flowId: number): Promise<{ message: string }> {
    return request(`/api/bot-flows/${flowId}`, {
      method: 'DELETE',
    });
  },

  async getGeneralSettings(): Promise<GeneralSettings> {
    return request('/api/settings/general');
  },

  async updateGeneralSettings(settings: GeneralSettings): Promise<GeneralSettings> {
    return request('/api/settings/general', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },

  // --- Conexões WhatsApp ---

  async getWhatsapps(): Promise<WhatsappConnection[]> {
    return request('/api/whatsapp');
  },

  async createWhatsapp(data: { name: string; queueIds?: number[]; isDefault?: boolean; greetingMessage?: string; farewellMessage?: string }): Promise<WhatsappConnection> {
    return request('/api/whatsapp', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateWhatsapp(id: number, data: { name?: string; queueIds?: number[]; isDefault?: boolean; greetingMessage?: string; farewellMessage?: string }): Promise<WhatsappConnection> {
    return request(`/api/whatsapp/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async startWhatsappSession(id: number): Promise<void> {
    return request(`/api/whatsappsession/${id}`, { method: 'POST' });
  },

  async restartWhatsappSession(id: number): Promise<void> {
    return request(`/api/whatsappsession/${id}`, { method: 'PUT' });
  },

  async disconnectWhatsapp(id: number): Promise<void> {
    return request(`/api/whatsappsession/${id}`, { method: 'DELETE' });
  },

  async deleteWhatsapp(id: number): Promise<void> {
    return request(`/api/whatsapp/${id}`, { method: 'DELETE' });
  },
};

import type { User, Ticket, Message, QuickAnswer, Queue, Contact, DashboardStats, TicketsByQueue, AgentPerformance, VolumeByPeriod, SLAByQueue, GreetingConfig, BotFlow, SystemUser, GeneralSettings, WhatsappConnection } from '@/types';

// Base URL da API. Usa valor salvo pelo usuário em "Configurar servidor"
// (tela de login), caindo no default de desenvolvimento (porta 8081, onde
// o docker-compose expõe o backend) quando não há valor salvo.
const cachedApiUrl = localStorage.getItem('api_url');
const API_URL = cachedApiUrl || 'http://localhost:8080';

function getToken(): string | null {
  return localStorage.getItem('token');
}

function headers(): HeadersInit {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

/**
 * Tenta renovar o token JWT usando o refresh token (cookie jrt).
 * Se funcionar, atualiza o token no localStorage e retorna o novo token.
 * Se falhar, retorna null.
 */
async function tryRefreshToken(): Promise<string | null> {
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
      if (data.token) {
        localStorage.setItem('token', data.token);
        if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
        return data.token as string;
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

  // Se o token expirou (401/403), tenta renovar antes de deslogar
  if (res.status === 401 || res.status === 403) {
    const newToken = await tryRefreshToken();
    if (newToken) {
      // Refaz a requisição com o token atualizado
      const retryRes = await fetch(`${baseUrl}${path}`, {
        ...options,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${newToken}`,
          ...options?.headers,
        },
      });
      if (retryRes.ok) return retryRes.json();
    }
    // Se o refresh também falhou, desloga
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('Unauthorized or Forbidden');
  }

  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export const api = {
  setBaseUrl(url: string) {
    localStorage.setItem('api_url', url);
  },

  getBaseUrl() {
    return API_URL;
  },

  async login(phone: string, password: string): Promise<User> {
    const data = await request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: phone, password }),
    });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return { ...data.user, token: data.token };
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
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
    const token = getToken();
    const formData = new FormData();
    const fileName = file instanceof File ? file.name : `audio_${Date.now()}.webm`;
    formData.append('medias', file, fileName);
    formData.append('body', caption);
    formData.append('fromMe', 'true');
    const res = await fetch(`${baseUrl}/api/messages/${ticketId}`, {
      method: 'POST',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: formData,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getQuickAnswers(search = ''): Promise<QuickAnswer[]> {
    const query = search ? `?searchParam=${encodeURIComponent(search)}` : '';
    return request(`/api/quickAnswers${query}`);
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
  // Backend gera automaticamente uma senha temporária e um token de reset
  // Retorna: user, resetToken (JWT), resetLink (URL completa para compartilhar)
  async createUser(data: { name: string; email: string; profile: string }): Promise<{ user: SystemUser; resetToken: string; resetLink: string }> {
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

  // Atualiza dados de um usuário existente
  // Campos atualizáveis: name, email, profile
  // Comentários em português
  async updateUser(userId: number, data: { name?: string; email?: string; profile?: string }): Promise<SystemUser> {
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

  async createWhatsapp(data: { name: string; queueIds?: number[]; isDefault?: boolean; greetingMessage?: string }): Promise<WhatsappConnection> {
    return request('/api/whatsapp', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateWhatsapp(id: number, data: { name?: string; queueIds?: number[]; isDefault?: boolean; greetingMessage?: string }): Promise<WhatsappConnection> {
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

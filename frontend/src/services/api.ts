import type { User, Ticket, Message, QuickAnswer, Queue, Contact, DashboardStats, TicketsByQueue, AgentPerformance, VolumeByPeriod, SLAByQueue, GreetingConfig, BotFlow, SystemUser, GeneralSettings } from '@/types';

const API_URL = localStorage.getItem('api_url') || 'http://localhost:8080';

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

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const baseUrl = localStorage.getItem('api_url') || API_URL;
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { ...headers(), ...options?.headers },
  });
  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export const api = {
  setBaseUrl(url: string) {
    localStorage.setItem('api_url', url);
  },

  getBaseUrl() {
    return localStorage.getItem('api_url') || 'http://localhost:8080';
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
    const baseUrl = localStorage.getItem('api_url') || 'http://localhost:8080';
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

  async getBotFlows(): Promise<BotFlow[]> {
    return request('/api/bot-flows');
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
};

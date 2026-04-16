export type UserProfile = 'admin' | 'developer' | 'agent';

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  queues: Queue[];
  token: string;
  profile?: UserProfile;
}

export interface Queue {
  id: number;
  name: string;
  color: string;
}

export interface Contact {
  id: number;
  name: string;
  number: string;
  profilePicUrl?: string;
  tags?: Tag[];
}

export interface Tag {
  id: number;
  name: string;
  color: string;
}

export interface Ticket {
  id: number;
  status: 'open' | 'pending' | 'closed';
  lastMessage: string;
  updatedAt: string;
  unreadMessages: number;
  contact: Contact;
  queue?: Queue;
  user?: { id: number; name: string };
}

export interface Message {
  id: number;
  body: string;
  read: boolean;
  fromMe: boolean;
  createdAt: string;
  mediaUrl?: string;
  mediaType?: string;
  ticketId: number;
  contact?: Contact;
}

export interface QuickAnswer {
  id: number;
  shortcut: string;
  message: string;
}

// Admin dashboard types
export interface DashboardStats {
  totalOpen: number;
  totalPending: number;
  totalClosed: number;
  avgResponseTime: number; // minutes
  todayTickets: number;
  todayResolved: number;
}

export interface TicketsByQueue {
  queue: string;
  color: string;
  open: number;
  pending: number;
  closed: number;
}

export interface AgentPerformance {
  id: number;
  name: string;
  openTickets: number;
  closedToday: number;
  avgResponseMin: number;
  satisfaction: number; // 0-100
}

export interface VolumeByPeriod {
  date: string;
  tickets: number;
  resolved: number;
}

export interface SLAByQueue {
  queue: string;
  color: string;
  avgFirstResponse: number;
  avgResolution: number;
  withinSLA: number; // percentage
}

// Developer config types
export interface GreetingConfig {
  id: number;
  queueId: number;
  queueName: string;
  message: string;
  enabled: boolean;
}

export interface BotFlow {
  id: number;
  name: string;
  queueId: number;
  queueName: string;
  steps: BotStep[];
  enabled: boolean;
}

export interface BotStep {
  id: number;
  message: string;
  options: { label: string; nextStepId?: number; queueId?: number }[];
}

export interface SystemUser {
  id: number;
  name: string;
  email: string;
  profile: UserProfile;
  queues: Queue[];
  enabled: boolean;
}

export interface GeneralSettings {
  businessHoursStart: string;
  businessHoursEnd: string;
  businessDays: number[];
  outOfHoursMessage: string;
  maxOpenTicketsPerAgent: number;
}

// Tipos de conexão WhatsApp (sessão do bot)
export type WhatsappStatus = 'OPENING' | 'qrcode' | 'CONNECTED' | 'TIMEOUT' | 'DISCONNECTED' | 'PAIRING';

export interface WhatsappConnection {
  id: number;
  name: string;
  status: WhatsappStatus;
  qrcode: string;
  battery: string;
  plugged: boolean;
  isDefault: boolean;
  retries: number;
  greetingMessage: string;
  farewellMessage: string;
  queues: Queue[];
  updatedAt: string;
}

# PWA Mobile - Painel Multi-Perfil para Atendimento

App mobile-first (PWA) para gerenciamento de tickets de atendimento via WhatsApp, com suporte a múltiplos perfis de usuário (Agente, Administrador e Developer). Integrado com backend Whaticket.

---

## 🚀 Stack Tecnológica

- **React 18** + **TypeScript 5** + **Vite 5**
- **Tailwind CSS v3** para estilização
- **React Router** para navegação
- **React Query** (@tanstack/query) para cache e sincronização de dados
- **Socket.IO Client** para comunicação real-time
- **Recharts** para visualização de dados (gráficos)
- **shadcn/ui** como sistema de componentes
- **Lucide Icons** para ícones

---

## 📱 Funcionalidades por Perfil

### 👤 Perfil: **Agente** (`agent`)

#### 🎫 Gestão de Tickets
- **Tabs de status**: Abertos, Pendentes, Fechados
- **Filtro por setor**: Agente vê apenas tickets das suas filas/departamentos
- **Busca**: Por nome de contato
- **Pull-to-refresh**: Atualização manual da lista
- **Badge de não lidos**: Contador visual de mensagens pendentes

#### 💬 Chat em Tempo Real
- Interface estilo WhatsApp com bolhas de mensagem
- Envio de texto, áudio e mídia (fotos/arquivos)
- **Respostas Rápidas**: Templates pré-configurados com busca
- **Gravador de Áudio**: Gravação de mensagens de voz com visualização de onda
- **Player de Áudio**: Reprodução de áudios recebidos com controles
- Scroll infinito para histórico

#### 👥 Contatos
- **Lista de Contatos Salvos**: Aba dedicada com busca
- **Salvar Contato**: Botão no perfil durante a conversa
- Visualização de tags e informações do contato

#### 📋 Perfil do Contato (Drawer)
- Nome, telefone e tags
- Transferir ticket para outro setor/agente
- Fechar/resolver ticket
- Salvar contato no sistema

#### 🔔 Notificações Push
- Notificações de novos tickets
- Notificações de novas mensagens
- Permissões gerenciadas automaticamente

---

### 📊 Perfil: **Administrador** (`admin`)

#### Dashboard de Métricas
**KPIs Principais:**
- Total de tickets abertos, pendentes e fechados
- Tempo médio de resposta (SLA)
- Tickets criados hoje
- Tickets resolvidos hoje

**Gráficos e Relatórios:**
- 📊 **Tickets por Setor**: Gráfico de barras com status (aberto/pendente/fechado)
- 📈 **Volume por Período**: Gráfico de linha com últimos 7 dias
- 👨‍💼 **Desempenho por Agente**: Tabela com tickets abertos, fechados, tempo de resposta e satisfação
- ⏱️ **SLA por Fila**: Métricas de tempo de primeira resposta e resolução

---

### ⚙️ Perfil: **Developer** (`developer`)

#### Painel de Configurações do Sistema

**Aba: Saudações**
- Configurar mensagem de boas-vindas por setor
- Ativar/desativar saudações

**Aba: Setores**
- CRUD de setores/filas
- Definir cores e nomes
- Gerenciar departamentos

**Aba: Usuários**
- Criar e gerenciar usuários (Agente/Admin)
- Atribuir setores aos agentes
- Ativar/desativar contas

**Aba: Fluxo do Bot**
- Editor visual de automação
- Criar menus interativos
- Definir etapas e opções de resposta
- Roteamento automático para setores

**Aba: Configurações Gerais**
- Horário de funcionamento (início/fim)
- Dias úteis (segunda a domingo)
- Mensagem de fora de expediente
- Limite de tickets por agente

---

## 📁 Estrutura de Pastas

```
src/
├── components/          # Componentes reutilizáveis
│   ├── ui/             # Componentes shadcn/ui
│   ├── AudioPlayer.tsx
│   ├── AudioRecorder.tsx
│   ├── BottomNav.tsx   # Navegação inferior adaptativa
│   ├── ChatBubble.tsx
│   ├── ContactDrawer.tsx
│   ├── QuickReplyPicker.tsx
│   └── TicketCard.tsx
├── contexts/
│   └── AuthContext.tsx # Gerenciamento de autenticação e perfil
├── hooks/
│   ├── useNotifications.ts  # Hook de notificações push
│   └── use-mobile.tsx
├── pages/              # Páginas/rotas
│   ├── Login.tsx       # Tela de login com seletor de perfil (demo)
│   ├── Index.tsx       # Lista de tickets (Agent)
│   ├── Attending.tsx   # Tickets em atendimento (Agent)
│   ├── Chat.tsx        # Conversa individual (Agent)
│   ├── Contacts.tsx    # Contatos salvos (Agent)
│   ├── AdminDashboard.tsx    # Dashboard (Admin)
│   ├── DeveloperPanel.tsx    # Painel de config (Developer)
│   ├── SettingsPage.tsx      # Configurações (todos)
│   └── NotFound.tsx
├── services/
│   ├── api.ts          # Cliente HTTP + endpoints
│   ├── socket.ts       # Cliente Socket.IO
│   ├── demo.ts         # Dados fictícios (Agent)
│   ├── demoAdmin.ts    # Dados fictícios (Admin/Developer)
│   └── notifications.ts # Service Worker de notificações
├── types/
│   └── index.ts        # Tipos TypeScript globais
├── App.tsx             # Rotas e guards de proteção
├── main.tsx            # Entry point
└── index.css           # Design tokens e CSS global
```

---

## 🔧 Instalação e Configuração

### 1. Instalar Dependências

```bash
npm install
# ou
bun install
```

### 2. Variáveis de Ambiente (Opcional)

O app usa `localStorage` para armazenar a URL base da API. Por padrão: `http://localhost:8080`

Para alterar, configure via interface de Settings ou defina no código:

```typescript
// src/services/api.ts
const API_URL = localStorage.getItem('api_url') || 'https://sua-api.com';
```

### 3. Rodar em Desenvolvimento

```bash
npm run dev
# ou
bun dev
```

Acesse: `http://localhost:5173`

### 4. Build para Produção

```bash
npm run build
# ou
bun run build
```

Os arquivos otimizados estarão em `dist/`

---

## 🌐 Integração com Backend Whaticket

### Endpoints da API REST

O frontend espera os seguintes endpoints no backend:

#### Autenticação
```
POST /api/auth/login
Body: { email: string, password: string }
Response: { token: string, user: User }
```

#### Tickets
```
GET /api/tickets?status={status}&queueIds=[...]&searchParam={query}
Response: { tickets: Ticket[], count: number }

GET /api/tickets/:id
Response: Ticket

PUT /api/tickets/:id
Body: { status?, queueId?, userId? }
Response: Ticket
```

#### Mensagens
```
GET /api/messages/:ticketId?pageNumber={page}
Response: { messages: Message[], count: number }

POST /api/messages/:ticketId
Body: { body: string, fromMe: true }
Response: Message

POST /api/messages/:ticketId (multipart/form-data)
Body: FormData com 'medias' (File) e 'body' (caption)
Response: Message
```

#### Respostas Rápidas
```
GET /api/quickAnswers?searchParam={query}
Response: QuickAnswer[]
```

#### Setores/Filas
```
GET /api/queue
Response: Queue[]
```

#### Contatos
```
GET /api/contacts?searchParam={query}
Response: { contacts: Contact[] }

POST /api/contacts/:id/save
Response: void
```

#### Admin (Relatórios) - *Endpoints sugeridos*
```
GET /api/dashboard/stats
Response: DashboardStats

GET /api/dashboard/tickets-by-queue
Response: TicketsByQueue[]

GET /api/dashboard/agent-performance
Response: AgentPerformance[]

GET /api/dashboard/volume?days=7
Response: VolumeByPeriod[]

GET /api/dashboard/sla
Response: SLAByQueue[]
```

#### Developer (Configurações) - *Endpoints sugeridos*
```
GET /api/settings/greetings
POST /api/settings/greetings
PUT /api/settings/greetings/:id

GET /api/settings/bot-flows
POST /api/settings/bot-flows
PUT /api/settings/bot-flows/:id

GET /api/settings/general
PUT /api/settings/general

GET /api/users
POST /api/users
PUT /api/users/:id
```

---

### 🔌 Socket.IO - Eventos em Tempo Real

O frontend escuta os seguintes eventos do backend:

#### Eventos de Tickets
```javascript
socket.on('ticket', (data) => {
  // Novo ticket criado ou atualizado
  // { action: 'create' | 'update' | 'delete', ticket: Ticket }
});
```

#### Eventos de Mensagens
```javascript
socket.on(`appMessage-${ticketId}`, (data) => {
  // Nova mensagem no ticket
  // { action: 'create', message: Message }
});
```

#### Conexão
```javascript
// Autenticação via token JWT
const socket = io('URL_DO_BACKEND', {
  auth: { token: 'SEU_JWT_TOKEN' },
  transports: ['websocket', 'polling']
});
```

**Configuração no Frontend:**
- Ver `src/services/socket.ts`
- Socket conecta automaticamente após login (apenas para perfil Agent)

---

## 🎭 Modo Demo

O app possui um **modo demonstração** completo que funciona sem backend.

### Como Usar

1. Na tela de login, clique em **"Entrar em modo Demo"**
2. Selecione o perfil desejado:
   - **Agente**: `agent@demo.com` / `demo123`
   - **Admin**: `admin@demo.com` / `demo123`
   - **Developer**: `dev@demo.com` / `demo123`

### Dados Fictícios Incluem:
- Tickets de exemplo com histórico
- Mensagens simuladas
- Contatos salvos
- Relatórios e gráficos (Admin)
- Configurações pré-populadas (Developer)

**Arquivos de Demo:**
- `src/services/demo.ts` (Agent)
- `src/services/demoAdmin.ts` (Admin/Developer)

---

## 📲 PWA (Progressive Web App)

### Manifest

O app é instalável como PWA. Configuração em `public/manifest.json`:

```json
{
  "name": "Painel de Atendimento",
  "short_name": "Atendimento",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#3b82f6",
  "background_color": "#fafbfc",
  "icons": [ ... ]
}
```

### Service Worker

- **Desenvolvimento**: Desabilitado (guard contra iframes)
- **Produção**: Ativar service worker em `src/main.tsx` se necessário

### Notificações Push

O hook `useNotifications()` solicita permissões e exibe notificações nativas:

```typescript
// src/hooks/useNotifications.ts
if (Notification.permission === 'granted') {
  new Notification('Novo Ticket', { body: '...' });
}
```

---

## 🎨 Design System

### Paleta de Cores

Baseada em **Cloud White** (definida em `src/index.css`):

```css
:root {
  --background: 0 0% 98%;      /* #fafbfc */
  --foreground: 222 47% 11%;
  --primary: 217 91% 60%;       /* #3b82f6 */
  --muted: 214 32% 91%;         /* #e8ecf1 */
  --muted-foreground: 215 16% 47%; /* #94a3b8 */
  --card: 0 0% 100%;
  --border: 214 32% 91%;
  --radius: 0.75rem;            /* rounded-xl */
}
```

### Tipografia

- **Font**: Inter (corpo e headings)
- **Peso**: Regular (400) e Bold (700)

### Componentes

Todos os componentes usam **tokens semânticos** do Tailwind:
- `bg-background`, `bg-card`, `bg-primary`
- `text-foreground`, `text-muted-foreground`
- `border`, `rounded-xl`

---

## 🛡️ Sistema de Autenticação e Guards

### Fluxo de Auth

1. Login via `api.login()` → retorna `{ token, user }`
2. Token armazenado em `localStorage`
3. `AuthContext` gerencia estado global do usuário
4. `ProtectedRoute` valida autenticação e perfil

### Guards de Rota

```typescript
// src/App.tsx
<Route 
  path="/admin" 
  element={
    <ProtectedRoute allowedProfiles={['admin']}>
      <AdminDashboard />
    </ProtectedRoute>
  } 
/>
```

### Redirecionamento Automático

Após login, o usuário é direcionado conforme o perfil:
- **Agent** → `/` (Lista de Tickets)
- **Admin** → `/admin` (Dashboard)
- **Developer** → `/developer` (Painel de Config)

---

## 🧪 Testes

```bash
npm test
# ou
bun test
```

Setup de testes em `src/test/setup.ts` com Vitest.

---

## 🚀 Dicas de Desenvolvimento

### 1. Adicionar Novo Endpoint

```typescript
// src/services/api.ts
async getCustomData(): Promise<CustomType> {
  if (isDemoMode()) return demoApi.getCustomData();
  return request('/api/custom-endpoint');
}
```

### 2. Criar Novo Evento Socket.IO

```typescript
import { getSocket } from '@/services/socket';

const socket = getSocket();
socket.on('customEvent', (data) => {
  console.log('Evento customizado:', data);
  // Atualizar estado React Query ou local
});
```

### 3. Adicionar Nova Aba no Developer Panel

```typescript
// src/pages/DeveloperPanel.tsx
<TabsList>
  <TabsTrigger value="nova-aba">Nova Aba</TabsTrigger>
</TabsList>

<TabsContent value="nova-aba">
  {/* Conteúdo da nova aba */}
</TabsContent>
```

### 4. Proteger Nova Rota

```typescript
// src/App.tsx
<Route 
  path="/nova-rota" 
  element={
    <ProtectedRoute allowedProfiles={['admin', 'developer']}>
      <NovoComponente />
    </ProtectedRoute>
  } 
/>
```

### 5. Usar React Query para Cache

```typescript
import { useQuery } from '@tanstack/react-query';

const { data, isLoading } = useQuery({
  queryKey: ['tickets', status],
  queryFn: () => api.getTickets({ status }),
  refetchInterval: 30000, // Atualiza a cada 30s
});
```

### 6. Adicionar Dados ao Modo Demo

```typescript
// src/services/demo.ts
export const demoApi = {
  async getCustomData(): Promise<CustomType> {
    return {
      // Dados fictícios aqui
    };
  }
};
```

---

## 🔐 Segurança

- **JWT Token**: Armazenado em `localStorage` (considere `httpOnly cookies` em produção)
- **Guards de Rota**: Validação de perfil em cada rota protegida
- **Validação Backend**: Nunca confie apenas no frontend - sempre valide permissões no backend
- **HTTPS**: Use sempre em produção

---

## 📦 Deploy

### Lovable Cloud (Recomendado)
1. Push para o repositório Git
2. Deploy automático via Lovable Cloud

### Vercel/Netlify
```bash
npm run build
# Upload da pasta dist/
```

### Variáveis de Ambiente
Configure `API_URL` via interface ou variável de ambiente antes do build.

---

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch: `git checkout -b feature/nova-funcionalidade`
3. Commit: `git commit -m 'Adiciona nova funcionalidade'`
4. Push: `git push origin feature/nova-funcionalidade`
5. Abra um Pull Request

---

## 📄 Licença

Este projeto está sob a licença MIT.

---

## 🆘 Suporte

Para dúvidas sobre integração com backend Whaticket, consulte a [documentação oficial do Whaticket](https://github.com/canove/whaticket).

**Endpoints sugeridos** (Admin/Developer) precisam ser implementados no backend - a estrutura frontend já está pronta para consumir.

---

## 🎯 Roadmap Futuro

- [ ] Exportar relatórios em PDF/CSV
- [ ] Filtro de período customizado nos relatórios
- [ ] Editor de fluxo de bot com drag-and-drop visual
- [ ] Tema escuro (dark mode)
- [ ] Suporte a múltiplos idiomas (i18n)
- [ ] Chat em grupo (atendimento colaborativo)
- [ ] Integração com CRM externo

---

**Desenvolvido com ❤️ usando Lovable + React + TypeScript**

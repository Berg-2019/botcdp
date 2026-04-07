# Sistema de Atendimento WhatsApp — Loja de Varejo
### Prompt Completo para Claude Code + Code Review

***

## 1. Visão Geral e Objetivo

Construir um sistema de atendimento automatizado via WhatsApp para uma loja de varejo que comercializa **ferramentas manuais, elétricas e a bateria**, **peças para máquinas agrícolas**, **mangueiras hidráulicas sob medida e conexões** e **materiais elétricos**.

O sistema recebe mensagens no WhatsApp, apresenta um menu interativo e direciona o cliente para o setor correto, onde um agente humano assume o atendimento.

### Stack Base
| Componente | Tecnologia | Função |
|---|---|---|
| Bridge WhatsApp | **Evolution API v2** | Conectar número WhatsApp via QR Code, expor webhooks e enviar mensagens [^1] |
| Bot / Menu | **Typebot** (self-hosted) | Criar fluxo de menu, capturar escolha do setor, chamar webhook [^2][^3] |
| CRM Multi-agente | **Chatwoot** (self-hosted) | Receber conversas, distribuir por team/fila, interface dos 6 agentes [^4][^5] |
| Orquestrador | **Node.js / Express** | API intermediária: recebe webhook do Typebot, chama API do Chatwoot [^6] |
| Infra | **Docker Compose** | Sobe todos os serviços em containers isolados [^7] |

***

## 2. Setores e Agentes

```
Setor 1 → Escritório / Financeiro / Cadastro   (1 agente: financeiro)
Setor 2 → Vendas Balcão                        (1 agente: vendedor_balcao)
Setor 3 → Vendas Agrícola                      (1 agente: vendedor_agricola)
Setor 4 → Serviços - Mangueiras Hidráulicas    (1 agente: tecnico_mangueira)
Setor 5 → Serviços - Baterias                  (1 agente: tecnico_bateria)
Setor 6 → Socorro / Emergência                 (1 agente: atendente_socorro)
```

Cada setor corresponde a:
- Uma **Team** no Chatwoot
- Um **Inbox** dedicado no Chatwoot (ou roteamento via label)
- Um **agente** cadastrado e vinculado à team respectiva[^8][^9]

***

## 3. Arquitetura do Sistema

```
                   ┌──────────────────────────────────────────────┐
                   │               DOCKER HOST                    │
                   │                                              │
  WhatsApp ───────►│  Evolution API v2  (:8080)                   │
  (QR Code)        │       │                                      │
                   │       │ webhook: message_received            │
                   │       ▼                                      │
                   │  Typebot (:3000)                             │
                   │  [Fluxo: Menu de Setores]                    │
                   │       │                                      │
                   │       │ HTTP POST /webhook/chatwoot-router   │
                   │       ▼                                      │
                   │  Orquestrador Node.js (:3001)                │
                   │  [chatwoot-router]                           │
                   │       │                                      │
                   │       │ Chatwoot REST API                    │
                   │       ▼                                      │
                   │  Chatwoot (:3000 interno / :80 proxy)        │
                   │  [Teams + Agents + Conversations]            │
                   │                                              │
                   │  PostgreSQL (:5432) — Redis (:6379)          │
                   └──────────────────────────────────────────────┘
```

**Fluxo resumido:**
1. Cliente manda qualquer mensagem no WhatsApp
2. Evolution API recebe e dispara webhook para o Typebot
3. Typebot envia menu de boas-vindas + opções de setor
4. Cliente escolhe o número do setor
5. Typebot faz POST no Orquestrador com `{ phone, name, setor_id, setor_nome }`
6. Orquestrador chama API do Chatwoot: cria/recupera contato → cria conversa → atribui à team do setor → muda status para `open`
7. Agente do setor recebe a conversa no painel Chatwoot e assume

***

## 4. Estrutura de Diretórios do Projeto

```
varejo-atendimento/
├── docker-compose.yml
├── .env
├── .env.example
├── README.md
│
├── evolution/
│   └── .env                         # config Evolution API
│
├── typebot/
│   └── flows/
│       └── menu-principal.json      # fluxo exportado Typebot
│
├── chatwoot-router/                 # serviço Node.js orquestrador
│   ├── Dockerfile
│   ├── package.json
│   ├── package-lock.json
│   ├── src/
│   │   ├── index.js                 # entry point Express
│   │   ├── routes/
│   │   │   ├── webhook.js           # POST /webhook/typebot
│   │   │   └── health.js            # GET /health
│   │   ├── services/
│   │   │   ├── chatwootService.js   # toda interação com API Chatwoot
│   │   │   └── evolutionService.js  # enviar msgs via Evolution API
│   │   ├── config/
│   │   │   ├── sectors.js           # mapeamento setor_id → team_id Chatwoot
│   │   │   └── env.js               # validação de variáveis de ambiente
│   │   └── middlewares/
│   │       └── validateWebhook.js   # valida secret do Typebot
│   └── tests/
│       ├── webhook.test.js
│       └── chatwootService.test.js
│
├── scripts/
│   ├── setup-chatwoot.sh            # cria teams e agentes via API
│   ├── seed-chatwoot.js             # seed inicial: teams, labels
│   └── connect-evolution.sh         # helper para scan QR Code
│
└── docs/
    ├── ARQUITETURA.md
    ├── CONFIGURACAO.md
    └── RUNBOOK.md
```

***

## 5. `docker-compose.yml` Completo

```yaml
version: '3.9'

services:
  # ── PostgreSQL compartilhado ──────────────────────────────────────
  postgres:
    image: postgres:15-alpine
    container_name: varejo_postgres
    restart: always
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - varejo_net
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  # ── Redis compartilhado ───────────────────────────────────────────
  redis:
    image: redis:7-alpine
    container_name: varejo_redis
    restart: always
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    networks:
      - varejo_net
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # ── Evolution API v2 ─────────────────────────────────────────────
  evolution-api:
    image: atendai/evolution-api:v2.1.1
    container_name: varejo_evolution
    restart: always
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    ports:
      - "8080:8080"
    environment:
      SERVER_URL: ${EVOLUTION_SERVER_URL}
      AUTHENTICATION_API_KEY: ${EVOLUTION_API_KEY}
      DATABASE_ENABLED: "true"
      DATABASE_PROVIDER: "postgresql"
      DATABASE_CONNECTION_URI: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      DATABASE_SAVE_DATA_INSTANCE: "true"
      DATABASE_SAVE_DATA_NEW_MESSAGE: "true"
      DATABASE_SAVE_MESSAGE_UPDATE: "true"
      DATABASE_SAVE_DATA_CONTACTS: "true"
      DATABASE_SAVE_DATA_CHATS: "true"
      CACHE_REDIS_ENABLED: "true"
      CACHE_REDIS_URI: redis://:${REDIS_PASSWORD}@redis:6379/1
      CACHE_REDIS_PREFIX_KEY: "evolution_v2"
      DEL_INSTANCE: "false"
      TYPEBOT_ENABLED: "true"
      TYPEBOT_API_VERSION: "latest"
      CHATWOOT_ENABLED: "true"
    volumes:
      - evolution_instances:/evolution/instances
    networks:
      - varejo_net

  # ── Chatwoot ─────────────────────────────────────────────────────
  chatwoot:
    image: chatwoot/chatwoot:latest
    container_name: varejo_chatwoot
    restart: always
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    ports:
      - "3000:3000"
    environment:
      SECRET_KEY_BASE: ${CHATWOOT_SECRET_KEY}
      FRONTEND_URL: ${CHATWOOT_URL}
      DEFAULT_LOCALE: pt_BR
      FORCE_SSL: "false"
      ENABLE_ACCOUNT_SIGNUP: "false"
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379/0
      POSTGRES_HOST: postgres
      POSTGRES_USERNAME: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DATABASE: ${POSTGRES_DB}
      RAILS_ENV: production
      NODE_ENV: production
      INSTALLATION_ENV: docker
      ACTIVE_STORAGE_SERVICE: local
      STORAGE_BUCKET_NAME: chatwoot
    volumes:
      - chatwoot_storage:/app/storage
      - chatwoot_public:/app/public
    command: bundle exec rails s -p 3000 -b 0.0.0.0
    networks:
      - varejo_net

  # Chatwoot Sidekiq worker
  chatwoot-worker:
    image: chatwoot/chatwoot:latest
    container_name: varejo_chatwoot_worker
    restart: always
    depends_on:
      - chatwoot
    environment:
      SECRET_KEY_BASE: ${CHATWOOT_SECRET_KEY}
      FRONTEND_URL: ${CHATWOOT_URL}
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379/0
      POSTGRES_HOST: postgres
      POSTGRES_USERNAME: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DATABASE: ${POSTGRES_DB}
      RAILS_ENV: production
    volumes:
      - chatwoot_storage:/app/storage
    command: bundle exec sidekiq -C config/sidekiq.yml
    networks:
      - varejo_net

  # ── Typebot Builder ───────────────────────────────────────────────
  typebot-builder:
    image: baptisteArno/typebot-builder:latest
    container_name: varejo_typebot_builder
    restart: always
    ports:
      - "3001:3000"
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/typebot
      NEXTAUTH_URL: ${TYPEBOT_BUILDER_URL}
      NEXT_PUBLIC_VIEWER_URL: ${TYPEBOT_VIEWER_URL}
      ENCRYPTION_SECRET: ${TYPEBOT_ENCRYPTION_SECRET}
      ADMIN_EMAIL: ${TYPEBOT_ADMIN_EMAIL}
    networks:
      - varejo_net
    depends_on:
      postgres:
        condition: service_healthy

  # ── Typebot Viewer ────────────────────────────────────────────────
  typebot-viewer:
    image: baptisteArno/typebot-viewer:latest
    container_name: varejo_typebot_viewer
    restart: always
    ports:
      - "3002:3000"
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/typebot
      NEXT_PUBLIC_VIEWER_URL: ${TYPEBOT_VIEWER_URL}
      NEXTAUTH_URL: ${TYPEBOT_BUILDER_URL}
      ENCRYPTION_SECRET: ${TYPEBOT_ENCRYPTION_SECRET}
    networks:
      - varejo_net
    depends_on:
      postgres:
        condition: service_healthy

  # ── Orquestrador (chatwoot-router) ───────────────────────────────
  chatwoot-router:
    build:
      context: ./chatwoot-router
      dockerfile: Dockerfile
    container_name: varejo_router
    restart: always
    ports:
      - "3010:3010"
    environment:
      PORT: "3010"
      CHATWOOT_URL: http://chatwoot:3000
      CHATWOOT_API_TOKEN: ${CHATWOOT_API_TOKEN}
      CHATWOOT_ACCOUNT_ID: ${CHATWOOT_ACCOUNT_ID}
      EVOLUTION_URL: http://evolution-api:8080
      EVOLUTION_API_KEY: ${EVOLUTION_API_KEY}
      EVOLUTION_INSTANCE: ${EVOLUTION_INSTANCE_NAME}
      WEBHOOK_SECRET: ${ROUTER_WEBHOOK_SECRET}
      NODE_ENV: production
    networks:
      - varejo_net
    depends_on:
      - chatwoot
      - evolution-api

volumes:
  postgres_data:
  redis_data:
  evolution_instances:
  chatwoot_storage:
  chatwoot_public:

networks:
  varejo_net:
    driver: bridge
```

***

## 6. `.env.example`

```dotenv
# ── Banco de Dados ─────────────────────────────────────────────────
POSTGRES_USER=varejo_user
POSTGRES_PASSWORD=TROQUE_AQUI_SENHA_FORTE
POSTGRES_DB=varejo_db

# ── Redis ──────────────────────────────────────────────────────────
REDIS_PASSWORD=TROQUE_AQUI_REDIS

# ── Evolution API v2 ───────────────────────────────────────────────
EVOLUTION_SERVER_URL=http://localhost:8080
EVOLUTION_API_KEY=TROQUE_AQUI_EVOLUTION_KEY
EVOLUTION_INSTANCE_NAME=loja_varejo

# ── Chatwoot ───────────────────────────────────────────────────────
CHATWOOT_URL=http://localhost:3000
CHATWOOT_SECRET_KEY=TROQUE_AQUI_SECRET_64_CHARS
CHATWOOT_API_TOKEN=          # preencher após primeiro login
CHATWOOT_ACCOUNT_ID=1

# ── Typebot ────────────────────────────────────────────────────────
TYPEBOT_BUILDER_URL=http://localhost:3001
TYPEBOT_VIEWER_URL=http://localhost:3002
TYPEBOT_ENCRYPTION_SECRET=TROQUE_AQUI_32_CHARS
TYPEBOT_ADMIN_EMAIL=admin@sualoja.com.br

# ── Orquestrador ───────────────────────────────────────────────────
ROUTER_WEBHOOK_SECRET=TROQUE_AQUI_WEBHOOK_SECRET
```

***

## 7. Orquestrador — Código Completo (`chatwoot-router/`)

### `package.json`

```json
{
  "name": "chatwoot-router",
  "version": "1.0.0",
  "description": "Webhook router: Typebot → Chatwoot para atendimento por setores",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js",
    "test": "jest --coverage"
  },
  "dependencies": {
    "axios": "^1.7.2",
    "dotenv": "^16.4.5",
    "express": "^4.19.2"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "nodemon": "^3.1.4",
    "supertest": "^7.0.0"
  }
}
```

### `src/config/env.js`

```javascript
require('dotenv').config();

const required = [
  'CHATWOOT_URL',
  'CHATWOOT_API_TOKEN',
  'CHATWOOT_ACCOUNT_ID',
  'EVOLUTION_URL',
  'EVOLUTION_API_KEY',
  'EVOLUTION_INSTANCE',
  'WEBHOOK_SECRET',
];

required.forEach((key) => {
  if (!process.env[key]) {
    console.error(`[FATAL] Variável de ambiente obrigatória ausente: ${key}`);
    process.exit(1);
  }
});

module.exports = {
  PORT: process.env.PORT || 3010,
  CHATWOOT_URL: process.env.CHATWOOT_URL,
  CHATWOOT_API_TOKEN: process.env.CHATWOOT_API_TOKEN,
  CHATWOOT_ACCOUNT_ID: Number(process.env.CHATWOOT_ACCOUNT_ID),
  EVOLUTION_URL: process.env.EVOLUTION_URL,
  EVOLUTION_API_KEY: process.env.EVOLUTION_API_KEY,
  EVOLUTION_INSTANCE: process.env.EVOLUTION_INSTANCE,
  WEBHOOK_SECRET: process.env.WEBHOOK_SECRET,
  NODE_ENV: process.env.NODE_ENV || 'development',
};
```

### `src/config/sectors.js`

```javascript
/**
 * Mapeamento de setores para IDs das Teams no Chatwoot.
 * ATENÇÃO: Os team_id devem ser atualizados após criar as teams
 * via script setup-chatwoot.sh ou manualmente no painel Chatwoot.
 *
 * Estrutura:
 *   [setor_id_typebot]: {
 *     team_id: <ID da team no Chatwoot>,
 *     team_name: <nome descritivo>,
 *     inbox_id: <ID do inbox WhatsApp no Chatwoot>,
 *     welcome_message: <mensagem enviada ao cliente ao entrar na fila>
 *   }
 */
const SECTORS = {
  '1': {
    team_id: null,          // PREENCHER após setup
    team_name: 'Escritório / Financeiro / Cadastro',
    inbox_id: null,         // PREENCHER após setup
    welcome_message:
      '✅ Você foi direcionado para o setor *Financeiro/Cadastro*.\nAguarde, em breve um de nossos atendentes irá responder.',
  },
  '2': {
    team_id: null,
    team_name: 'Vendas Balcão',
    inbox_id: null,
    welcome_message:
      '🛒 Você foi direcionado para *Vendas Balcão*.\nFerramentas, materiais elétricos e mais. Aguarde nosso atendente!',
  },
  '3': {
    team_id: null,
    team_name: 'Vendas Agrícola',
    inbox_id: null,
    welcome_message:
      '🌾 Você foi direcionado para *Vendas Agrícola*.\nPeças e equipamentos para máquinas. Aguarde!',
  },
  '4': {
    team_id: null,
    team_name: 'Serviços - Mangueiras',
    inbox_id: null,
    welcome_message:
      '🔧 Você foi direcionado para *Serviços de Mangueiras Hidráulicas*.\nFaremos seu orçamento! Aguarde o técnico.',
  },
  '5': {
    team_id: null,
    team_name: 'Serviços - Baterias',
    inbox_id: null,
    welcome_message:
      '🔋 Você foi direcionado para *Serviços de Baterias*.\nAguarde nosso técnico especializado.',
  },
  '6': {
    team_id: null,
    team_name: 'Socorro / Emergência',
    inbox_id: null,
    welcome_message:
      '🆘 *SOCORRO* — Sua solicitação de emergência foi recebida!\nUm atendente irá te contatar IMEDIATAMENTE.',
  },
};

module.exports = SECTORS;
```

### `src/services/chatwootService.js`

```javascript
const axios = require('axios');
const env = require('../config/env');

const chatwootApi = axios.create({
  baseURL: `${env.CHATWOOT_URL}/api/v1/accounts/${env.CHATWOOT_ACCOUNT_ID}`,
  headers: {
    'api_access_token': env.CHATWOOT_API_TOKEN,
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

/**
 * Busca ou cria um contato no Chatwoot pelo número de telefone.
 * @param {string} phone - Número no formato 5511999999999
 * @param {string} name  - Nome do cliente (opcional)
 * @returns {Promise<object>} Objeto contato do Chatwoot
 */
async function upsertContact(phone, name = 'Cliente') {
  // Busca contato existente
  const searchRes = await chatwootApi.get('/contacts/search', {
    params: { q: phone, include_contacts: true },
  });

  const existing = searchRes.data?.payload?.find(
    (c) => c.phone_number === `+${phone}` || c.phone_number === phone
  );

  if (existing) return existing;

  // Cria novo contato
  const createRes = await chatwootApi.post('/contacts', {
    name,
    phone_number: `+${phone}`,
    additional_attributes: { source: 'whatsapp_bot' },
  });

  return createRes.data;
}

/**
 * Cria uma nova conversa no Chatwoot e atribui à team do setor.
 * @param {number} contactId  - ID do contato no Chatwoot
 * @param {number} inboxId    - ID do inbox WhatsApp
 * @param {number} teamId     - ID da team do setor
 * @param {string} sectorName - Nome do setor para label
 * @returns {Promise<object>} Objeto conversa criado
 */
async function createConversation(contactId, inboxId, teamId, sectorName) {
  const res = await chatwootApi.post('/conversations', {
    inbox_id: inboxId,
    contact_id: contactId,
    team_id: teamId,
    status: 'open',
    additional_attributes: {
      sector: sectorName,
      origin: 'whatsapp_bot_menu',
    },
  });

  return res.data;
}

/**
 * Envia mensagem de boas-vindas como agente bot na conversa.
 * @param {number} conversationId
 * @param {string} message
 */
async function sendBotMessage(conversationId, message) {
  await chatwootApi.post(`/conversations/${conversationId}/messages`, {
    content: message,
    message_type: 'outgoing',
    private: false,
  });
}

/**
 * Atribui a conversa a uma team específica.
 * @param {number} conversationId
 * @param {number} teamId
 */
async function assignTeam(conversationId, teamId) {
  await chatwootApi.patch(`/conversations/${conversationId}/update`, {
    team_id: teamId,
  });
}

/**
 * Lista todas as teams cadastradas na conta.
 * Útil para validar IDs configurados em sectors.js
 */
async function listTeams() {
  const res = await chatwootApi.get('/teams');
  return res.data;
}

module.exports = {
  upsertContact,
  createConversation,
  sendBotMessage,
  assignTeam,
  listTeams,
};
```

### `src/services/evolutionService.js`

```javascript
const axios = require('axios');
const env = require('../config/env');

const evolutionApi = axios.create({
  baseURL: `${env.EVOLUTION_URL}/instance/${env.EVOLUTION_INSTANCE}`,
  headers: {
    'apikey': env.EVOLUTION_API_KEY,
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

/**
 * Envia mensagem de texto simples via Evolution API.
 * Usado para confirmar ao cliente que foi direcionado.
 * @param {string} to      - Número destino: 5511999999999
 * @param {string} message - Texto a enviar
 */
async function sendTextMessage(to, message) {
  const res = await evolutionApi.post('/sendText', {
    number: to,
    text: message,
  });
  return res.data;
}

module.exports = { sendTextMessage };
```

### `src/middlewares/validateWebhook.js`

```javascript
const env = require('../config/env');

/**
 * Middleware simples de validação do secret do webhook.
 * O Typebot deve enviar o header x-webhook-secret com o valor configurado.
 */
function validateWebhook(req, res, next) {
  const secret = req.headers['x-webhook-secret'];

  if (env.NODE_ENV === 'development') {
    // Em dev, aceita sem validação para facilitar testes locais
    return next();
  }

  if (!secret || secret !== env.WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized: invalid webhook secret' });
  }

  next();
}

module.exports = validateWebhook;
```

### `src/routes/webhook.js`

```javascript
const express = require('express');
const router = express.Router();
const SECTORS = require('../config/sectors');
const chatwootService = require('../services/chatwootService');
const evolutionService = require('../services/evolutionService');
const validateWebhook = require('../middlewares/validateWebhook');

/**
 * POST /webhook/typebot
 *
 * Payload esperado do Typebot:
 * {
 *   "phone": "5511999999999",
 *   "name": "João Silva",
 *   "setor_id": "2",
 *   "setor_nome": "Vendas Balcão"
 * }
 */
router.post('/typebot', validateWebhook, async (req, res) => {
  const { phone, name, setor_id } = req.body;

  if (!phone || !setor_id) {
    return res.status(400).json({
      error: 'Campos obrigatórios ausentes: phone, setor_id',
    });
  }

  const sector = SECTORS[String(setor_id)];
  if (!sector) {
    return res.status(400).json({ error: `setor_id "${setor_id}" não encontrado` });
  }

  if (!sector.team_id || !sector.inbox_id) {
    console.error(
      `[CONFIG] team_id ou inbox_id não configurado para setor ${setor_id}. ` +
      `Edite src/config/sectors.js com os IDs corretos do Chatwoot.`
    );
    return res.status(500).json({
      error: 'Configuração de setor incompleta. Verifique sectors.js',
    });
  }

  try {
    // 1. Criar/recuperar contato
    const contact = await chatwootService.upsertContact(phone, name || 'Cliente');

    // 2. Criar conversa na team do setor
    const conversation = await chatwootService.createConversation(
      contact.id,
      sector.inbox_id,
      sector.team_id,
      sector.team_name
    );

    // 3. Enviar mensagem de boas-vindas do setor
    await chatwootService.sendBotMessage(
      conversation.id,
      sector.welcome_message
    );

    console.log(
      `[OK] Conversa #${conversation.id} criada para ${phone} → ${sector.team_name}`
    );

    return res.status(200).json({
      success: true,
      conversation_id: conversation.id,
      team: sector.team_name,
    });
  } catch (err) {
    console.error('[ERROR] Falha ao processar webhook:', err?.response?.data || err.message);
    return res.status(500).json({
      error: 'Erro interno ao criar conversa no Chatwoot',
      detail: err?.response?.data || err.message,
    });
  }
});

module.exports = router;
```

### `src/routes/health.js`

```javascript
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = router;
```

### `src/index.js`

```javascript
const express = require('express');
const env = require('./config/env');
const webhookRoutes = require('./routes/webhook');
const healthRoutes = require('./routes/health');

const app = express();

app.use(express.json());

// Logging básico de requisições
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.use('/webhook', webhookRoutes);
app.use('/health', healthRoutes);

// Handler de erro global
app.use((err, _req, res, _next) => {
  console.error('[UNHANDLED ERROR]', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(env.PORT, () => {
  console.log(`[chatwoot-router] Rodando na porta ${env.PORT}`);
  console.log(`[chatwoot-router] Chatwoot: ${env.CHATWOOT_URL}`);
  console.log(`[chatwoot-router] Evolution: ${env.EVOLUTION_URL}`);
});

module.exports = app;
```

### `chatwoot-router/Dockerfile`

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY src/ ./src/

EXPOSE 3010

USER node

CMD ["node", "src/index.js"]
```

***

## 8. Fluxo Typebot — Especificação do Fluxo JSON

O Claude Code deve criar o fluxo Typebot em `typebot/flows/menu-principal.json` com a seguinte lógica:

```
[Start]
  │
  ▼
[Text] "Olá! 👋 Bem-vindo(a) à *[NOME DA LOJA]*!
Sou o assistente virtual. Como posso te ajudar?
Por favor, escolha o setor:"

  │
  ▼
[Buttons / Input Number] — opcoes:
  1️⃣  Escritório / Financeiro / Cadastro
  2️⃣  Vendas Balcão (Ferramentas e Elétrica)
  3️⃣  Vendas Agrícola (Peças e Máquinas)
  4️⃣  Serviços - Mangueiras Hidráulicas
  5️⃣  Serviços - Baterias
  6️⃣  🆘 Socorro / Emergência
  0️⃣  Repetir menu

  │
  ▼
[Save Input] → variável: {{setor_escolhido}}

  │
  ├── [If setor == "0"] → voltar ao menu
  │
  ├── [If setor == "1..6"]
  │     ▼
  │   [Text] "Aguarde, direcionando para o setor..."
  │     ▼
  │   [HTTP Request]
  │     URL: http://chatwoot-router:3010/webhook/typebot
  │     Method: POST
  │     Headers: x-webhook-secret: {{WEBHOOK_SECRET}}
  │     Body:
  │     {
  │       "phone": "{{contact.phoneNumber}}",
  │       "name": "{{contact.name}}",
  │       "setor_id": "{{setor_escolhido}}"
  │     }
  │     ▼
  │   [Text] "✅ Você foi direcionado!
  │           Em breve um atendente irá responder.
  │           Horário: Seg-Sex 8h-18h / Sáb 8h-12h"
  │
  └── [Else] → [Text] "Opção inválida. Tente novamente."
                    → voltar ao menu
```

**Configuração no Typebot:**
- Criar fluxo com nome `Menu Principal - Varejo`
- Conectar ao WhatsApp via Evolution API: Integrations → WhatsApp → Evolution API
- URL do viewer: `http://localhost:3002` (ou domínio produção)
- Configurar `contact.phoneNumber` como variável automática do WhatsApp

***

## 9. Script de Setup do Chatwoot (`scripts/setup-chatwoot.sh`)

```bash
#!/usr/bin/env bash
# setup-chatwoot.sh
# Cria as 6 teams no Chatwoot via API REST.
# Executar APÓS primeiro login no Chatwoot e pegar o API Token.
# Uso: CHATWOOT_URL=http://localhost:3000 CHATWOOT_TOKEN=xxx ACCOUNT_ID=1 ./setup-chatwoot.sh

set -e

URL="${CHATWOOT_URL:-http://localhost:3000}"
TOKEN="${CHATWOOT_TOKEN:?CHATWOOT_TOKEN obrigatório}"
ACCOUNT="${ACCOUNT_ID:-1}"

create_team() {
  local name="$1"
  local description="$2"
  echo "Criando team: $name"
  curl -s -X POST \
    "${URL}/api/v1/accounts/${ACCOUNT}/teams" \
    -H "api_access_token: ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"name\": \"${name}\", \"description\": \"${description}\"}" | jq '{id, name}'
}

create_team "Financeiro - Cadastro"   "Escritório, financeiro e cadastro de clientes"
create_team "Vendas Balcão"           "Ferramentas manuais, elétricas, a bateria e materiais elétricos"
create_team "Vendas Agrícola"         "Peças para máquinas agrícolas"
create_team "Serviços Mangueiras"     "Mangueiras hidráulicas sob medida e conexões"
create_team "Serviços Baterias"       "Manutenção e venda de baterias"
create_team "Socorro Emergência"      "Atendimento emergencial e campo"

echo ""
echo "✅ Teams criadas! Copie os IDs acima e atualize src/config/sectors.js"
echo "   Depois crie os agentes e vincule às teams no painel Chatwoot."
```

***

## 10. Guia de Configuração Pós-Deploy (`docs/CONFIGURACAO.md`)

### Ordem de Setup (sequência obrigatória)

```
1. cp .env.example .env
   → Preencher todas as variáveis

2. docker compose up -d postgres redis
   → Aguardar healthcheck OK

3. docker compose up -d chatwoot chatwoot-worker
   → Acessar http://localhost:3000
   → Criar conta admin
   → Ir em Profile → Access Token → copiar para CHATWOOT_API_TOKEN no .env

4. ./scripts/setup-chatwoot.sh
   → Anota os team_id retornados

5. No painel Chatwoot:
   → Settings → Inboxes → Add Inbox → WhatsApp
   → Configurar com Evolution API (próximo passo)
   → Anota inbox_id

6. Atualizar src/config/sectors.js com team_id e inbox_id reais

7. docker compose up -d evolution-api
   → GET http://localhost:8080/instance/create (criar instância)
   → Scan QR Code para conectar WhatsApp

8. No painel Evolution Manager ou API:
   → Configurar Typebot webhook apontando para
     http://typebot-viewer:3000/api/v1/...
   → Configurar Chatwoot integration (URL + token)

9. docker compose up -d typebot-builder typebot-viewer
   → Acessar http://localhost:3001
   → Criar fluxo conforme seção 8 deste documento

10. docker compose up -d chatwoot-router
    → Verificar: GET http://localhost:3010/health

11. No Typebot, no bloco HTTP Request, configurar URL:
    http://chatwoot-router:3010/webhook/typebot

12. Testar enviando mensagem para o número WhatsApp conectado
```

### Criar Agentes no Chatwoot

Acessar Settings → Agents → Invite Agent:

| Nome | Email | Função | Team |
|---|---|---|---|
| Financeiro | financeiro@loja.com | agent | Financeiro - Cadastro |
| Vendedor Balcão | balcao@loja.com | agent | Vendas Balcão |
| Vendedor Agrícola | agricola@loja.com | agent | Vendas Agrícola |
| Técnico Mangueiras | mangueiras@loja.com | agent | Serviços Mangueiras |
| Técnico Baterias | baterias@loja.com | agent | Serviços Baterias |
| Atendente Socorro | socorro@loja.com | agent | Socorro Emergência |

***

## 11. Checklist de Code Review

O desenvolvedor deve verificar os seguintes pontos antes de colocar em produção:

### Segurança
- [ ] Todas as senhas e tokens estão apenas no `.env`, nunca no código-fonte
- [ ] `.env` está no `.gitignore`
- [ ] `WEBHOOK_SECRET` está configurado e validado em produção (`validateWebhook.js`)
- [ ] Evolution API Key não está exposta em logs
- [ ] Chatwoot está acessível apenas internamente (sem porta 3000 exposta publicamente sem proxy)
- [ ] HTTPS configurado via Nginx/Traefik em produção

### Robustez
- [ ] `upsertContact` trata corretamente duplicatas (busca antes de criar)
- [ ] Todos os `await` têm `try/catch` adequado
- [ ] Logs de erro incluem contexto suficiente para debug
- [ ] Timeouts configurados no axios (`timeout: 10000`)
- [ ] Healthcheck `/health` retornando 200

### Configuração
- [ ] `sectors.js` está com `team_id` e `inbox_id` reais (não `null`)
- [ ] Todos os serviços no docker-compose têm `restart: always`
- [ ] Volumes persistentes declarados para postgres, redis, evolution, chatwoot
- [ ] `depends_on` com `condition: service_healthy` para postgres e redis

### Funcional
- [ ] Opção "0" no menu retorna ao início do fluxo
- [ ] Opção inválida no Typebot é tratada com mensagem de erro
- [ ] Mensagem de boas-vindas do setor é enviada após direcionamento
- [ ] Agentes recebem a conversa na fila correta do Chatwoot
- [ ] Testar todos os 6 setores com número real de WhatsApp

### Testes
- [ ] Rodar `npm test` no `chatwoot-router` com pelo menos 80% de cobertura
- [ ] Testar webhook com `curl` manual antes de integrar ao Typebot
- [ ] Simular falha do Chatwoot e verificar resposta de erro do router

***

## 12. Extensões Futuras (backlog)

Estas features não fazem parte do escopo inicial mas são sugeridas para iterações futuras:

- **Horário de atendimento:** Se fora do horário, o bot responde automaticamente sem criar conversa no Chatwoot. Implementar verificação de horário no `webhook.js` antes de chamar `chatwootService`.
- **Coleta de dados antes do setor:** Perguntar nome e CPF/CNPJ no Typebot antes de redirecionar, populando campos personalizados do contato no Chatwoot.
- **Transferência entre setores:** Agente pode transferir a conversa para outra team via painel Chatwoot sem o cliente precisar reiniciar.
- **Integração com N8N:** Adicionar container N8N ao docker-compose para automações mais complexas (ex.: consultar estoque, gerar orçamentos, notificar por e-mail).
- **Métricas e SLA:** Usar o Kanban e relatórios nativos do Chatwoot para acompanhar tempo médio de atendimento por setor.
- **Backup automático:** Adicionar cron job para dump diário do PostgreSQL via `pg_dump`.
- **Domínio e SSL:** Configurar Nginx Proxy Manager ou Traefik como reverse proxy com Let's Encrypt para expor os serviços com HTTPS.

---

## References

1. [Docker - Evolution API Documentation](https://doc.evolution-api.com/v2/pt/install/docker) - Implantar a Evolution API v2 usando o Docker Compose simplifica a configuração e o gerenciamento de ...

2. [Typebot](https://typebot.com) - Typebot is a no-code platform that enables you to effortlessly create and integrate advanced chatbot...

3. [Typebot is a powerful chatbot builder that you can self-host. - GitHub](https://github.com/baptisteArno/typebot.io) - Typebot makes it easy to create advanced chatbots. It provides the building blocks that are adaptabl...

4. [Chatwoot - Atendimento Digital Multi-Canais](https://linuxsolutions.com.br/chatwoot/) - O Chatwoot permite criar várias equipes de atendimento e distribuir conversas entre agentes com base...

5. [Guia do usuário | Chatwoot](https://chatwoot.app.br/hc/user-guide/pt_BR) - Aprenda como usar o Chatwoot de maneira eficaz e aproveitar ao máximo seus recursos para aprimorar o...

6. [Introduction to Chatwoot APIs](https://developers.chatwoot.com/api-reference/introduction) - Learn how to use Chatwoot APIs to build integrations, customize chat experiences, and manage your in...

7. [Docker - Evolution API Documentation](https://doc.evolution-api.com/v2/en/install/docker) - Evolution API v2 is Docker-ready and can be easily deployed with Docker in standalone or swarm mode....

8. [List Agents in Team - Chatwoot Developer Docs](https://developers.chatwoot.com/api-reference/teams/list-agents-in-team) - Provides access to endpoints based on the user permissions levels. This token can be saved by an ext...

9. [Update Agents in Team - Chatwoot Developer Docs](https://developers.chatwoot.com/api-reference/teams/update-agents-in-team) - Provides access to endpoints based on the user permissions levels. This token can be saved by an ext...


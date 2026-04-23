# Changelog - BotCDP

## Data: 22/04/2026

---

## Alteração 1: Sistema de Status de Tickets + Botão Aceitar

### Problema
- Tickets ficavam em "Pendente" durante todo o atendimento
- Não havia botão para agente aceitar o ticket
- Status visual não aparecia nos cards de ticket
- Filtro de status não funcionava corretamente

### Solução
**Frontend:**
- `frontend/src/pages/Chat.tsx` - Adicionado:
  - Banner "Ticket pendente - Aguardando aceite" com botão "Aceitar Ticket"
  - Badge de status no header do chat (Pendente/Em Atendimento/Finalizado)
  - Handler `handleAcceptTicket()` que muda status para 'open'
- `frontend/src/components/TicketCard.tsx` - Adicionado:
  - Badge colorido com ícone para cada status
  - Cores: `pending`=amarelo, `open`=verde, `closed`=cinza

**Backend:**
- `backend/src/services/TicketServices/ListTicketsService.ts` - Corrigido:
  - Lógica de filtro de status agora funciona corretamente
  - Se `status` é fornecido, usa ele; se não, usa `userId OR pending`

### Fluxo Implementado
```
Cliente inicia conversa → Ticket "Pendente" (esperando na fila)
    ↓
Agente aceita ticket → Ticket "Aberto" (em atendimento)
    ↓
Agente envia/recebe mensagens → Status permanece "Aberto"
    ↓
Agente fecha ticket → Ticket "Fechado" (finalizado)
```

---

## Alteração 2: Correção do Sistema de Chat

### Problema
- Mensagens apareciam em ordem invertida (mais nova no topo, mais antiga embaixo)
- Após enviar mensagem, não aparecia imediatamente na tela
- Scroll automático não funcionava corretamente após envio
- O código tinha `.reverse()` duplicado (backend E frontend)

### Solução
**Frontend (`frontend/src/pages/Chat.tsx`):**
- Removido `.reverse()` desnecessário - o backend já retorna em ordem correta
- Movido scroll automático para dentro do `fetchMessages` usando `requestAnimationFrame`
- Removido useEffect redundante de scroll
- Simplificada lógica de ordenação de mensagens

**Causa raiz:** O backend (`ListMessagesService.ts`) já faz `.reverse()` para corrigir a ordenação do Sequelize que retorna `ORDER BY createdAt DESC`. O frontend estava fazendo `.reverse()` novamente, invertendo a ordem duas vezes.

### Fluxo Correto
```
Backend: SELECT * FROM messages ORDER BY createdAt DESC → .reverse() → ordem cronológica
Frontend: Recebe em ordem cronológica → exibe sem inversão adicional
```

---

## Alteração 3: Atualização em Tempo Real do Chat (Socket)

### Problema
- Quando o agente enviava mensagem, ela não aparecia na tela
- Quando o cliente enviava mensagem, o chat não atualizava em tempo real
- Era necessário dar refresh na página para ver novas mensagens

### Causa Raiz
1. **Frontend** não emitia `joinChatBox` para entrar no canal do ticket
2. **Backend** não salvava mensagem no banco ao enviar (só enviava para WhatsApp)
3. Socket emitia para o canal, mas cliente não estava escuchando

### Solução

**Frontend (`frontend/src/pages/Chat.tsx`):**
- Adicionado `socket.emit("joinChatBox", ticketId.toString())` no useEffect
- Agora o cliente entra no canal correto do ticket

**Backend (`backend/src/controllers/MessageController.ts`):**
- Importado `CreateMessageService`
- Após `SendWhatsAppMessage`, chama `CreateMessageService` para salvar mensagem
- `CreateMessageService` emite `appMessage` para o canal do ticket

### Fluxo Correto (Após Correção)
```
Agente envia mensagem:
  1. Chat.tsx → api.sendMessage()
  2. MessageController.store() → SendWhatsAppMessage()
  3. CreateMessageService() → Salva no banco
  4. io.to(ticketId).emit("appMessage") → Frontend recebe
  5. fetchMessages() → Atualiza tela

Cliente envia mensagem:
  1. WhatsApp → handleWhatsappEvents
  2. CreateMessageService() → Salva no banco
  3. io.to(ticketId).emit("appMessage") → Frontend recebe
  4. fetchMessages() → Atualiza tela
```

---

## Alteração 4: Editar Conexões WhatsApp

### Problema
Conexões WhatsApp já existentes não podiam ser editadas - não havia opção de alterar setores ou mensagem de saudação.

### Solução
Adicionado botão "Editar" em cada card de conexão que abre um dialog para alterar:
- Setores associados
- Mensagem de saudação (se 2+ setores)

O backend já suportava UpdateWhatsAppService, só faltava a UI.

**Arquivos modificados:**
- `frontend/src/services/api.ts` - Adicionada função updateWhatsapp()
- `frontend/src/pages/DeveloperPanel.tsx` - Adicionados estados, handlers, botão e dialog

---

## Alteração 5: CRUD de Setores (Filas)

### Problema
A aba "Setores" não tinha funcionalidade - não era possível criar, editar ou remover setores.

### Solução
Implementado CRUD completo de setores no frontend:
- **Criar:** Dialog com campos nome, cor e mensagem de saudação
- **Editar:** Mesmo dialog com dados pré-preenchidos
- **Remover:** Dialog de confirmação

**Arquivos modificados:**
- `frontend/src/services/api.ts` - Adicionadas funções createQueue, updateQueue, deleteQueue
- `frontend/src/pages/DeveloperPanel.tsx` - Adicionados estados, handlers e dialogs

---

## Alteração 6: Salvar Mensagens de Saudação

### Problema
As mensagens de saudação podiam ser editadas localmente mas não eram salvas no backend.

### Solução
Adicionado botão "Salvar" em cada card de saudação que chama a API de update.

**Arquivos modificados:**
- `frontend/src/services/api.ts` - Adicionada função updateGreeting
- `frontend/src/pages/DeveloperPanel.tsx` - Adicionado botão salvar e handler handleSaveGreeting

---

## Alteração 7: Horário de Funcionamento Editável

### Problema
O botão "Salvar Configurações" existia mas não tinha funcionalidade conectada.

### Solução
Adicionada função `handleSaveSettings` que conecta o botão à API de configurações gerais.

**Arquivo modificado:**
- `frontend/src/pages/DeveloperPanel.tsx` - Adicionado estado `savingSettings`, função `handleSaveSettings` e conectado ao botão

---

## Alteração 8: Associação Dinâmica de Setores

### Problema
O desenvolvedor não conseguia associar setores a uma conexão WhatsApp ao criar. O menu de escolha de setor só aparecia se houvesse 2+ setores associados, mas não havia UI para fazer essa associação.

### Solução
Adicionada UI no frontend para selecionar setores ao criar conexão, com validação anti-duplicata no backend.

---

## Backend - Alterações

### 1. `backend/src/services/WhatsappService/AssociateWhatsappQueue.ts`
**Status:** Modificado

**Mudanças:**
- Adicionada validação anti-duplicata
- Verifica se alguma fila já está associada a outra conexão
- Retorna erro com mensagem clara se houver duplicação

### 2. `backend/src/services/QueueService/ListAvailableQueuesService.ts`
**Status:** Novo arquivo

**Função:** Lista filas não associadas a nenhuma conexão

### 3. `backend/src/routes/queueRoutes.ts`
**Status:** Modificado

**Mudança:** Adicionado endpoint `GET /api/queue/available`

---

## Frontend - Alterações

### 4. `frontend/src/services/api.ts`
**Status:** Modificado

**Mudanças:**
- Função `getAvailableQueues()`
- Função `createQueue(data)`
- Função `updateQueue(id, data)`
- Função `deleteQueue(id)`
- Função `updateGreeting(queueId, data)`

### 5. `frontend/src/pages/DeveloperPanel.tsx`
**Status:** Modificado

**Mudanças:**
- Estados para CRUD de setores (showQueueDialog, editingQueue, savingQueue, etc.)
- Estados para saudações (handleSaveGreeting)
- Estados para configurações gerais (savingSettings, handleSaveSettings)
- Dialogs completos para criar/editar/remover setores
- Botão salvar conectado em saudações
- Botão salvar conectado em configurações gerais

---

## Fluxo de Uso

1. **Gerenciar Setores:**
   - Developer → Aba Setores
   - Criar novo setor: botão "Novo Setor"
   - Editar: botão lápis no card
   - Remover: botão lixeira no card

2. **Editar Saudações:**
   - Developer → Aba Saudações
   - Editar mensagem e toggle de enabled
   - Clicar "Salvar"

3. **Criar conexão com setores:**
   - Developer → Aba Bot → Clica "Nova Conexão"
   - Seleciona os setores (checkboxes)
   - Se 2+ setores → preenche mensagem de saudação
   - Clica "Criar Conexão"

4. **Editar configurações gerais:**
   - Developer → Aba Geral
   - Edita horário, dias, mensagem, máximo de tickets
   - Clica "Salvar Configurações"

---

## Arquivos Modificados

| # | Arquivo | Tipo |
|---|---------|------|
| 1 | `backend/src/services/WhatsappService/AssociateWhatsappQueue.ts` | Modificado |
| 2 | `backend/src/services/QueueService/ListAvailableQueuesService.ts` | Novo |
| 3 | `backend/src/routes/queueRoutes.ts` | Modificado |
| 4 | `frontend/src/services/api.ts` | Modificado |
| 5 | `frontend/src/pages/DeveloperPanel.tsx` | Modificado |

---

## Como Testar

1. Acessar http://localhost:3000

2. CRUD de Setores:
   - Developer → Aba Setores
   - Criar, editar, remover setores

3. Saudações:
   - Developer → Aba Saudações
   - Editar mensagem e clicar Salvar

4. Criar conexão com setores:
   - Developer → Aba Bot → "Nova Conexão"
   - Selecionar 2+ setores
   - Criar conexão

5. Testar no WhatsApp:
   - Enviar "Olá" 
   - Ver se menu de escolha aparece

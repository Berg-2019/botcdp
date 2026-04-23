# Inconsistências Frontend vs Backend — Status e Decisões

Este documento registra todas as inconsistências identificadas entre o frontend (React/TypeScript) e o backend (Node.js/Express/Sequelize) do BotCDP, junto com o status de cada uma.

---

## Correções Aplicadas ✅

### 3 — `Message.id`: `string` → `number`
**Problema:** O model `Message` declarava `id: string` (padrão Sequelize), mas o frontend espera `number`. Isso quebra comparações e tipagem.

**Solução aplicada:**
- `backend/src/models/Message.ts:18-21` — `@AutoIncrement @Column id: number`
- `backend/src/models/Message.ts:63-65` — `quotedMsgId: number` (também string → number)

---

### 4 — `WhatsappStatus` sem validação
**Problema:** O backend aceitava qualquer string como status da conexão WhatsApp. O frontend declara um enum fixo (`OPENING`, `qrcode`, `CONNECTED`, `TIMEOUT`, `DISCONNECTED`, `PAIRING`).

**Solução aplicada:**
- `backend/src/models/Whatsapp.ts:20-30` — `static VALID_STATUSES` com todos os valores válidos
- `backend/src/services/WhatsappService/ListWhatsAppsService.ts:14-19` — normaliza status inválido para `DISCONNECTED`
- `backend/src/services/WhatsappService/CreateWhatsAppService.ts:51-53` — rejeita status inválido com `ERR_INVALID_WHATSAPP_STATUS`
- `backend/src/services/WhatsappService/UpdateWhatsAppService.ts:53-55` — mesma rejeição no update

---

### 9 — `UpdateUserService` permite campos `undefined`
**Problema:** O Yup schema não tinha `.required()` e o `user.update()` recebia `undefined`, potencialmente sobrescrevendo campos com `NULL` no banco.

**Solução aplicada:**
- `backend/src/services/UserServices/UpdateUserService.ts:56-62` — construindo `updateData` manualmente, incluindo apenas campos fornecidos (`email`, `name`, `profile`, `whatsappId`), ignorando `password` por segurança

---

### 12 — `avgResponseMin` hardcoded como `0`
**Problema:** `agentPerformance` e `slaByQueue` retornavam `avgResponseMin: 0` e `avgFirstResponse` estimado como 20% da resolução. O dashboard mostrava dados fictícios.

**Solução aplicada:**
- `backend/src/controllers/DashboardController.ts` — `agentPerformance`: calcula tempo médio real entre `ticket.createdAt` e primeira `Message.fromMe: true` via `TIMESTAMPDIFF(SECOND)`
- `backend/src/controllers/DashboardController.ts` — `slaByQueue`: calcula `avgFirstResponse` real dos tickets fechados de cada fila, e `withinSLA` usa `resMin <= SLA_THRESHOLD_MIN` direto (não mais `* 0.2`)

---

## NÃO Aplicadas — Postergadas ⏸️

### 1 — `getQuickAnswers` / QuickReplyPicker não existe no backend 🔴
O componente `QuickReplyPicker` (atalho de respostas rápidas no chat) está pronto no frontend mas não há model, service, controller ou rota no backend.

**Impacto:** O botão Zap no Chat tenta carregar via API `/api/quickAnswers` e falha silenciosamente.

**Ação pendente:** Criar `QuickAnswer` model + CRUD completo no backend.

---

### 2 — `saveContact` não existe no backend 🔴
`ContactDrawer.tsx` chama `api.saveContact(ticket.contact.id)` → `POST /api/contacts/:contactId/save`, mas essa rota não existe no backend.

**Impacto:** Botão "Salvar Contato" no drawer não funciona.

**Ação pendente:** Adicionar rota `POST /contacts/:id/save` no backend.

---

### 5 — `User.phone` não existe no backend 🟢
`types/index.ts:7` declara `phone: string` no `User`, mas o model `User` só tem `email`. O login do frontend já mapeia `phone → email`, então funciona por convenção.

**Ação pendente:** Documentar que o campo `phone` do usuário é armazenado no campo `email`.

---

### 6 — `SerializeUser` não retorna `token` 🟢
O helper `SerializeUser` não inclui o `token`. O frontend guarda o token via `localStorage` no login, não recebe do serialize.

**Impacto:** Nenhum — funciona porque o token vem do login e é cacheado.

---

### 7 — `ListUsersService` sem `enabled` 🟢
O frontend força `enabled: true` artificialmente após receber a lista de usuários, sem verificar status real no backend.

**Ação pendente:** Backend deveria adicionar campo `enabled` / `isActive` no model User e retorná-lo.

---

### 8 — Trailing slash em `/whatsapp/` 🟢
`whatsappRoutes.ts` define `get("/whatsapp/")` com trailing slash. O frontend chama `/api/whatsapp` sem. Funciona por coincidência (Express não dá match estrito).

**Ação pendente:** Padronizar sem trailing slash em todas as rotas.

---

### 10 — `ListTicketsService` converte `userId` de `string` 🟢
`ShowUserService` é chamado com `userId` como string quando `withUnreadMessages === "true"`. O frontend nunca usa esse parâmetro.

**Impacto:** Nenhum na prática.

---

### 11 — `AgentPerformance.satisfaction` baseado em fórmula fictícia 🟡
`satisfaction = Math.min(100, 80 + closedToday * 2)` é uma fórmula arbitrária, não mede satisfação real.

**Ação pendente:** Implementar pesquisa de satisfação ou usar métricas reais.

---

### 13 — `MessageController.store` retorna `res.send()` 🟢
O backend retorna `res.send()` sem body após enviar mensagem. O frontend não usa o retorno de `sendMessage`, então não quebra — mas é inconsistente com o padrão REST.

**Ação pendente:** Retornar a mensagem criada como JSON.

---

## Resumo

| # | Inconsistência | Severidade | Status |
|---|---|---|---|
| 1 | `getQuickAnswers` inexistente | 🔴 Crítica | ⏸️ Pendente |
| 2 | `saveContact` inexistente | 🔴 Crítica | ⏸️ Pendente |
| 3 | `Message.id` tipo errado | 🟡 Média | ✅ Aplicada |
| 4 | `WhatsappStatus` sem validação | 🟡 Média | ✅ Aplicada |
| 5 | `User.phone` fantasma | 🟢 Baixa | ⏸️ Pendente |
| 6 | `SerializeUser` sem `token` | 🟢 Baixa | ⏸️ Pendente |
| 7 | `enabled` fictício | 🟢 Baixa | ⏸️ Pendente |
| 8 | Trailing slash | 🟢 Baixa | ⏸️ Pendente |
| 9 | `UpdateUserService` null | 🟡 Média | ✅ Aplicada |
| 10 | `userId` string | 🟢 Baixa | ✅ Funciona |
| 11 | `satisfaction` fictícia | 🟡 Média | ⏸️ Pendente |
| 12 | `avgResponseMin = 0` | 🟡 Média | ✅ Aplicada |
| 13 | `res.send()` sem body | 🟢 Baixa | ⏸️ Pendente |
# Fluxos do Bot (BotFlow)

> Documento de handoff — **última atualização: 2026-04-17**
>
> Este doc descreve a feature de triagem automática via bot (BotFlow), que estava parcialmente implementada (CRUD existia mas não era executada pelo recebedor de mensagens). Inclui o que foi feito nesta iteração, decisões arquiteturais e próximos passos.

## Visão geral

Um **BotFlow** é um fluxo de triagem/coleta de informações que roda automaticamente quando uma mensagem chega e o ticket já tem fila atribuída mas ainda não foi assumido por um atendente humano.

A ideia: antes de um humano atender, o bot pode fazer perguntas para entender o motivo do contato, coletar dados básicos, ou redirecionar para outra fila. Quando o fluxo termina, o ticket fica `pending` na fila e um atendente assume com o contexto já coletado.

```
Cliente manda "oi"
    ↓
Menu de filas (se Whatsapp tem >1 fila) — handleQueueLogic
    ↓ (cliente escolhe "2 - Suporte")
Ticket.queueId = Suporte
    ↓
BotFlow da fila Suporte inicia (Step 0)
    ↓ "Qual produto? 1-TV 2-Celular"
    ↓ (cliente responde "1")
Step 1 "Descreva o problema"
    ↓ (cliente responde)
Fim do fluxo — ticket fica pending, atendente humano assume
```

## Componentes

### Backend

| Arquivo | Papel |
|---|---|
| [backend/src/models/BotFlow.ts](../backend/src/models/BotFlow.ts) | Modelo do fluxo (nome, fila, enabled, steps). |
| [backend/src/models/BotStep.ts](../backend/src/models/BotStep.ts) | Etapa do fluxo. `options` persistido como JSON. |
| [backend/src/models/Ticket.ts](../backend/src/models/Ticket.ts) | **Alterado** — ganhou `botFlowId`, `botStepId`, `botInvalidAttempts`. |
| [backend/src/database/migrations/20260417000000-add-bot-state-to-tickets.ts](../backend/src/database/migrations/20260417000000-add-bot-state-to-tickets.ts) | **Nova** — adiciona as 3 colunas acima. |
| [backend/src/controllers/BotFlowController.ts](../backend/src/controllers/BotFlowController.ts) | **Reescrito** — CRUD agora resolve `nextStepIndex` → `nextStepId` após recriar steps no update. |
| [backend/src/routes/botFlowRoutes.ts](../backend/src/routes/botFlowRoutes.ts) | Rotas REST `/api/bot-flows` (sem alteração). |
| [backend/src/services/WbotServices/ExecuteBotFlowService.ts](../backend/src/services/WbotServices/ExecuteBotFlowService.ts) | **Novo** — executa o fluxo a cada mensagem recebida. |
| [backend/src/handlers/handleWhatsappEvents.ts](../backend/src/handlers/handleWhatsappEvents.ts) | **Alterado** — chama `ExecuteBotFlowService` depois de `handleQueueLogic`. |

### Frontend

| Arquivo | Papel |
|---|---|
| [frontend/src/services/api.ts](../frontend/src/services/api.ts) | **Alterado** — adicionados `createBotFlow`, `updateBotFlow`, `deleteBotFlow`. |
| [frontend/src/components/BotFlowEditorDialog.tsx](../frontend/src/components/BotFlowEditorDialog.tsx) | **Novo** — dialog de criação/edição de fluxo com steps e opções dinâmicos. |
| [frontend/src/pages/DeveloperPanel.tsx](../frontend/src/pages/DeveloperPanel.tsx) | **Alterado** — aba "Bot" agora tem botões reais de criar/editar/remover/toggle. |

## Modelo de dados

### Ticket (colunas novas)

```ts
botFlowId: number | null          // fluxo em execução (FK para BotFlows, SET NULL on delete)
botStepId: number | null          // step atual (FK para BotSteps, SET NULL on delete)
botInvalidAttempts: number        // default 0; usado para desistir do fluxo após N erros
```

### BotStep.options (JSON)

```ts
{
  label: string                    // rótulo mostrado ao cliente (ex.: "Vendas")
  nextStepId?: number              // ID real do próximo step (dentro do mesmo fluxo)
  queueId?: number                 // se presente, transfere o ticket para essa fila
}
```

Uma opção com **nenhum** dos dois destinos encerra o fluxo.

## Fluxo de execução no backend

`handleMessage` em [handleWhatsappEvents.ts:296-337](../backend/src/handlers/handleWhatsappEvents.ts#L296-L337):

```
se não é grupo, não é fromMe, sem userId no ticket:
  se ticket sem queueId E whatsapp.queues >= 1:
    handleQueueLogic (menu de triagem de filas — comportamento antigo)
    ticket.reload()

  se ticket.queueId:
    ExecuteBotFlowService(ticket, messageBody, contact)
```

`ExecuteBotFlowService`:

1. Busca `BotFlow` enabled onde `queueId = ticket.queueId`. Sem fluxo → retorna.
2. Se `ticket.botStepId` é null, inicia pelo step de menor `stepOrder`.
3. Senão, parseia a mensagem contra as options do step atual (match por número ou por label):
   - Opção com `queueId` → transfere fila e inicia fluxo da nova fila (se existir).
   - Opção com `nextStepId` → avança para o próximo step.
   - Sem match → incrementa `botInvalidAttempts`; após 3 falhas, encerra o fluxo.
4. Step sem options ou opção terminal → limpa estado (`botFlowId/botStepId/botInvalidAttempts`), ticket fica `pending`.

## Edição no frontend

### Modo de referência por índice

O `BotFlowController.update` **recria** os steps (destroy + create), então os IDs dos steps mudam a cada save. Para evitar o frontend lidar com IDs voláteis, a convenção do payload de create/update é:

- Opção que aponta para outro step do mesmo fluxo: envia `nextStepIndex` (posição no array de `steps`, 0-indexed).
- Opção que transfere fila: envia `queueId`.
- O backend resolve `nextStepIndex` → `nextStepId` real depois de criar todos os steps.

O dialog ([BotFlowEditorDialog.tsx](../frontend/src/components/BotFlowEditorDialog.tsx)) trabalha internamente com índices o tempo todo. Ao abrir um fluxo existente, converte `nextStepId` recebido do backend em `nextStepIndex` olhando a posição do step alvo no array.

### Estado local

O dialog mantém um rascunho (`steps: DraftStep[]`). As funções `moveStep`, `removeStep`, `addOption` etc. reajustam os `nextStepIndex` das opções afetadas automaticamente para manter referências consistentes.

### Validação

Antes de salvar, o dialog valida:
- Nome e fila preenchidos
- Ao menos uma etapa
- Cada etapa com mensagem
- Cada opção com rótulo
- Ações `next`/`queue` com destino selecionado

## Como testar manualmente

1. **Rodar migration:**
   ```bash
   cd backend && npx sequelize-cli db:migrate
   ```

2. **Reiniciar backend** para carregar o model atualizado.

3. **Criar um fluxo** pelo painel:
   - Entrar no DeveloperPanel, aba "Bot", clicar em "Novo Fluxo".
   - Preencher nome, fila (escolher uma fila do seu WhatsApp), adicionar 2-3 etapas.
   - Na última etapa, opções com ação "Encerrar (humano assume)".
   - Ativar e salvar.

4. **Enviar mensagem** para o número conectado:
   - Se o WhatsApp tem 1 fila, o fluxo inicia direto.
   - Se tem 2+, o menu de fila aparece; ao escolher a fila do fluxo, ele inicia.
   - Responder com o número da opção (ex.: "1") — o bot avança.
   - Após última etapa, ticket aparece em `pending` na fila para o atendente humano.

## Limites conhecidos / próximos passos

- **Sem reorder de opções**: é possível adicionar/remover opções, mas não reordenar (só para steps). Baixa prioridade.
- **Sem coleta de respostas abertas**: se um step não tem options, o fluxo encerra. Não existe "pergunta aberta" que salva a resposta do cliente como tag ou nota no ticket. Já havíamos identificado — não implementado nesta iteração; segunda prioridade.
- **Sem timeout de fluxo**: se o cliente abandona a conversa no meio do fluxo, o estado fica persistido. Próxima mensagem (dias depois) retoma o mesmo step. Pode ser desejável limpar o estado após X horas inativas — a decidir com produto.
- **`BotFlow.queueId` não é unique**: permite múltiplos fluxos na mesma fila. O `ExecuteBotFlowService` pega o primeiro `enabled=true`. Se quiser garantir 1 fluxo ativo por fila, ou (a) adicionar constraint ou (b) desativar os outros no save.
- **Loops não protegidos**: o dialog remove o próprio step da lista de destinos, mas um ciclo A → B → A ainda é possível por edição. Baixa prioridade, mas vale revisitar.

## Debug rápido

- **Bot não responde**: confira no log do backend a linha `info: "Error handling message upsert"` ou veja se o fluxo é `enabled` e tem steps.
- **Mensagens não salvam estado**: verificar se a migration rodou (`SELECT * FROM information_schema.columns WHERE table_name='Tickets' AND column_name LIKE 'bot%';`).
- **QR code aparece mas bot fica mudo**: confirmar que `ticket.queueId` é populado. Se o Whatsapp não tem filas associadas, `handleQueueLogic` nunca atribui nada e o bot também não roda.
- **Opção `nextStepId` ficando null após edição**: significa que o frontend mandou `nextStepId` em vez de `nextStepIndex`. Verificar `buildPayload()` em `BotFlowEditorDialog.tsx`.

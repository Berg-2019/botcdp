# botcdp — Atendimento WhatsApp para CD Peças/Varejo

Sistema multi-agente de atendimento via WhatsApp para loja de varejo (ferramentas, peças agrícolas, mangueiras hidráulicas, materiais elétricos). Mensagens chegam, o bot apresenta um menu de 6 setores e direciona o ticket ao agente da fila correspondente.

## Stack

- **Backend**: Node.js + TypeScript + Express + Sequelize (fork enxuto do [whaticket-community](https://github.com/canove/whaticket-community))
- **Camada WhatsApp**: Baileys via provider `whaileys` (inspirado em [takeshi-bot](https://github.com/iLuanGB/takeshi-bot))
- **Frontend**: React (do whaticket-community)
- **Banco**: MariaDB/MySQL
- **Cache/Sessões**: Redis
- **Container**: Docker Compose

## Setores (Queues)

| ID | Setor | Agente seed |
|----|-------|------------|
| 1 | Escritório / Financeiro / Cadastro | financeiro@botcdp.com |
| 2 | Vendas Balcão | vendedor.balcao@botcdp.com |
| 3 | Vendas Agrícola | vendedor.agricola@botcdp.com |
| 4 | Serviços - Mangueiras Hidráulicas | tecnico.mangueira@botcdp.com |
| 5 | Serviços - Baterias | tecnico.bateria@botcdp.com |
| 6 | Socorro / Emergência | atendente.socorro@botcdp.com |

Senha inicial dos 6 agentes: **`cdp123`** (trocar em produção).
Admin inicial: `admin@botcdp.com` / `admin` (do seed do whaticket).

## Subir

```bash
cp .env.example .env
docker compose up -d --build
docker compose exec backend npx sequelize db:migrate
docker compose exec backend npx sequelize db:seed:all
```

Painel: http://localhost:3000 — Backend: http://localhost:8080

## Conectar WhatsApp

1. Logar no painel como admin.
2. Em **Conexões**, criar uma nova conexão (tipo `whaileys`) e dar um nome.
3. **Vincular as 6 queues à conexão** e definir a `greetingMessage` (texto do menu, ex.:
   `"Olá! Escolha o setor:"`). O whaticket irá automaticamente concatenar `1 - Escritório...` etc.
4. Escanear o QR code.

## Fluxo

1. Cliente manda qualquer mensagem → ticket criado em `pending` (sem queue).
2. Bot envia menu de 6 opções (concatenado a partir das queues vinculadas).
3. Cliente responde com `1`..`6` → `handleQueueLogic` faz `Ticket.update({ queueId })` e envia o `greetingMessage` daquela queue.
4. Ticket aparece na fila do agente vinculado àquela queue (`UserQueues`).

A lógica de menu/queue está em [backend/src/handlers/handleWhatsappEvents.ts](backend/src/handlers/handleWhatsappEvents.ts) (`handleQueueLogic`).

## Diferenças vs. whaticket-community

- Removido: `QuickAnswer`, `WppKey`, `ImportPhoneContacts`.
- Sessão Baileys persiste `creds` em `Whatsapps.session`; chaves de sinal ficam **em memória** (Map por sessão) — basta reescanear o QR após restart se a sessão expirar.
- Seed `20260407000000-create-cdp-sectors.ts` cria as 6 queues + 6 agentes + vínculos `UserQueues`.

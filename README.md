# BotCDP — Atendimento WhatsApp para CD Peças/Varejo

Sistema multi-agente de atendimento via WhatsApp para loja de varejo (ferramentas, peças agrícolas, mangueiras hidráulicas, materiais elétricos). O sistema recebe as mensagens, apresenta um menu interativo com 6 setores disponíveis, e direciona o cliente para a fila correspondente onde um agente assume o atendimento.

## Stack Tecnológica (Nova Estrutura)

- **Backend**: Node.js + TypeScript + Express + Sequelize. Uma versão otimizada e customizada (fork enxuto) do ecossistema whaticket-community.
- **Camada WhatsApp**: Integração baseada em Baileys via provider `whaileys` (inspirado em takeshi-bot).
- **Frontend (Novo)**: PWA Mobile-first construído com React 18, TypeScript, Vite e shadcn/ui. Completamente remodelado para desempenho e usabilidade com foco mobile.
- **Banco de Dados**: MariaDB/MySQL.
- **Cache e Controle de Sessão**: Redis.
- **Ambiente/Containerização**: Docker Compose.

> O frontend antigo desenvolvido em React/MUI encontra-se temporariamente arquivado no diretório `frontend-backup/` para fins de referência.

## Setores (Filas / Queues)

| ID | Nome do Setor | Agente Padrão (Email de Acesso) |
|----|-------|------------|
| 1 | Escritório / Financeiro / Cadastro | financeiro@botcdp.com |
| 2 | Vendas Balcão | vendedor.balcao@botcdp.com |
| 3 | Vendas Agrícola | vendedor.agricola@botcdp.com |
| 4 | Serviços - Mangueiras Hidráulicas | tecnico.mangueira@botcdp.com |
| 5 | Serviços - Baterias | tecnico.bateria@botcdp.com |
| 6 | Socorro / Emergência | atendente.socorro@botcdp.com |

**Credenciais Padrão:**
A senha inicial estabelecida para os 6 agentes é: **`cdp123`** *(Importante: alterar esta senha ao mover para produção)*.
Acesso do Usuário Administrador: `admin@botcdp.com` / `admin` (senha padrão do seed).

## Como Subir a Aplicação

Siga as etapas abaixo para criar as variáveis de ambiente, fazer a compilação das imagens do docker e povoar a base de dados:

```bash
# 1. Prepare as variáveis de ambiente
cp .env.example .env

# 2. Inicie os containers (construindo o novo frontend)
docker compose up -d --build

# 3. Execute as automações de banco de dados
docker compose exec backend npx sequelize db:migrate
docker compose exec backend npx sequelize db:seed:all
```

**Acessos Locais:**
- **Painel de Atendimento (Frontend):** http://localhost:3000
- **Servidor da API (Backend):** http://localhost:8080

## Primeira Conexão com o WhatsApp

1. Faça o login no painel de atendimento como administrador (`admin@botcdp.com`).
2. Navegue até a seção de **Conexões** e gere uma nova conexão preenchendo as configurações adequadas.
3. **Vincule todas as 6 filas (setores)** à conexão criada e configure sua Mensagem de Saudação (`greetingMessage`) — por exemplo: 
   `"Olá! Seja bem-vindo. Por favor, escolha um dos setores abaixo:"`. 
   > O sistema automaticamente anexará "1 - Escritório...", etc., não é necessário digitar as filas.
4. Escaneie o QR Code no seu aparelho telefônico para concretizar o vínculo.

## Fluxo de Operação

1. **Recepção:** O cliente envia uma mensagem inicial e um ticket é criado com estado `pendente` sem associação a nenhuma fila.
2. **Menu:** O bot envia o texto de boas-vindas seguido da listagem contendo nossa numeração de setores (baseada nas filas configuradas).
3. **Roteamento:** O cliente responde exclusivamente com um dígito (`1` a `6`). O núcleo do sistema (`handleQueueLogic`) detecta essa opção, atrela o ticket no banco de dados (`Ticket.update({ queueId })`) e retorna com uma mensagem de saudação específica daquela fila definida.
4. **Atendimento:** Nesse momento, o ticket desponta na interface dos usuários agentes atribuídos à respectiva fila.

A arquitetura responsiva dessa lógica fica principalmente concentrada no arquivo:
`backend/src/handlers/handleWhatsappEvents.ts`

## Ajustes e Padrões Aplicados 

- Suprimidos recursos não utilizados para dar performance: `QuickAnswer`, `WppKey`, `ImportPhoneContacts`.
- Sessão Baileys persistindo `creds` na coluna `Whatsapps.session`; no entanto, as chaves de re-sinal são estocadas apenas em espaço de memória (Map interno por sessão), bastando uma re-avaliação do QR Code se ocorrer reinício grave da instância.
- Seed automático `20260407000000-create-cdp-sectors.ts` gera e cadastra automaticamente os 6 setores básicos com agentes de testes.

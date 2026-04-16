
# App Mobile PWA - Painel do Agente de Vendas

## Visão Geral
App mobile-first (PWA) para agentes de vendas atenderem chamados/tickets de clientes via WhatsApp, com filtro por setor. Design limpo e claro (branco + azul), otimizado para uso em celular.

## Design
- **Paleta**: Branco (#fafbfc), cinza claro (#e8ecf1), cinza médio (#94a3b8), azul (#3b82f6)
- **Tipografia**: Inter (corpo) + headings em peso bold
- **Layout**: Mobile-first, bottom navigation bar estilo WhatsApp
- **Border radius**: Arredondado (cards e inputs suaves)

## Telas e Funcionalidades

### 1. Tela de Login
- Login via número de WhatsApp/telefone
- Campo de telefone com máscara brasileira
- Botão de entrar com validação
- Persistência de sessão via token JWT (padrão Whaticket)

### 2. Lista de Tickets (Tela Principal)
- Tabs de status: **Abertos**, **Pendentes**, **Fechados**
- Cada ticket mostra: nome do contato, última mensagem, horário, badge de não-lidas
- **Filtro por setor**: O agente só vê tickets do seu setor (departamento/queue)
- Pull-to-refresh para atualizar lista
- Badge com contador de tickets não lidos
- Busca por nome de contato

### 3. Tela de Chat (Conversa)
- Bolhas de mensagem estilo WhatsApp (enviadas à direita, recebidas à esquerda)
- Campo de texto com botão de enviar
- Suporte a envio de mídia (fotos/arquivos)
- Scroll infinito para histórico de mensagens
- Indicador de status da mensagem (enviada/lida)
- Botão de respostas rápidas (quick replies) com lista de templates pré-definidos

### 4. Respostas Rápidas
- Modal/drawer com lista de mensagens prontas
- Busca por palavra-chave nas respostas
- Ao selecionar, preenche o campo de texto automaticamente
- Organização por categoria

### 5. Informações do Contato
- Drawer lateral com dados do contato (nome, telefone, tags)
- Opção de transferir ticket para outro setor/agente
- Botão para fechar/resolver ticket

## Navegação (Bottom Nav Bar)
- 🏠 Tickets (lista principal)
- 💬 Em Atendimento (tickets ativos do agente)
- ⚙️ Configurações (perfil, logout)

## Integração com Backend (Whaticket API)
- Todas as chamadas via API REST configurável (URL base nas variáveis de ambiente)
- Endpoints mapeados: `/api/auth/login`, `/api/tickets`, `/api/messages/{ticketId}`, `/api/quickAnswers`, `/api/contacts`, `/api/queues`
- Comunicação real-time via Socket.IO para mensagens novas e atualizações de tickets
- Token JWT armazenado de forma segura

## PWA
- Manifest com ícones e nome do app
- Instalável via "Adicionar à Tela Inicial"
- Sem service worker em desenvolvimento (apenas produção)
- Guard contra registro em iframes/preview do Lovable

## Estrutura Técnica
- React + TypeScript + Tailwind CSS
- React Query para cache e sync de dados
- Socket.IO client para real-time
- React Router com rotas protegidas (auth guard)
- Componentes reutilizáveis (ChatBubble, TicketCard, QuickReplyPicker)

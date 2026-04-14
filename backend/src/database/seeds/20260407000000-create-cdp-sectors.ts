import { QueryInterface } from "sequelize";
import { hash } from "bcryptjs";

// Senha padrão dos 6 agentes setoriais: "cdp123" (trocar em produção).
// Hash gerado com bcryptjs (rounds=8) para alinhar com o hash do admin.

const sectors = [
  {
    id: 1,
    name: "Escritório / Financeiro / Cadastro",
    color: "#1F77B4",
    greetingMessage:
      "✅ Você foi direcionado para o setor *Financeiro/Cadastro*.\nAguarde, em breve um de nossos atendentes irá responder.",
    user: { name: "Financeiro", email: "financeiro@botcdp.com" }
  },
  {
    id: 2,
    name: "Vendas Balcão",
    color: "#FF7F0E",
    greetingMessage:
      "🛒 Você foi direcionado para *Vendas Balcão*.\nFerramentas, materiais elétricos e mais. Aguarde nosso atendente!",
    user: { name: "Vendedor Balcão", email: "vendedor.balcao@botcdp.com" }
  },
  {
    id: 3,
    name: "Vendas Agrícola",
    color: "#2CA02C",
    greetingMessage:
      "🌾 Você foi direcionado para *Vendas Agrícola*.\nPeças e equipamentos para máquinas. Aguarde!",
    user: { name: "Vendedor Agrícola", email: "vendedor.agricola@botcdp.com" }
  },
  {
    id: 4,
    name: "Serviços - Mangueiras Hidráulicas",
    color: "#D62728",
    greetingMessage:
      "🔧 Você foi direcionado para *Serviços de Mangueiras Hidráulicas*.\nFaremos seu orçamento! Aguarde o técnico.",
    user: { name: "Técnico Mangueiras", email: "tecnico.mangueira@botcdp.com" }
  },
  {
    id: 5,
    name: "Serviços - Baterias",
    color: "#9467BD",
    greetingMessage:
      "🔋 Você foi direcionado para *Serviços de Baterias*.\nAguarde nosso técnico especializado.",
    user: { name: "Técnico Baterias", email: "tecnico.bateria@botcdp.com" }
  },
  {
    id: 6,
    name: "Socorro / Emergência",
    color: "#E377C2",
    greetingMessage:
      "🆘 *SOCORRO* — Sua solicitação de emergência foi recebida!\nUm atendente irá te contatar IMEDIATAMENTE.",
    user: { name: "Atendente Socorro", email: "atendente.socorro@botcdp.com" }
  }
];

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const now = new Date();
    const passwordHash = await hash("cdp123", 8);

    await queryInterface.bulkInsert(
      "Queues",
      sectors.map(s => ({
        id: s.id,
        name: s.name,
        color: s.color,
        greetingMessage: s.greetingMessage,
        createdAt: now,
        updatedAt: now
      }))
    );

    await queryInterface.bulkInsert(
      "Users",
      sectors.map(s => ({
        name: s.user.name,
        email: s.user.email,
        passwordHash,
        profile: "user",
        tokenVersion: 0,
        createdAt: now,
        updatedAt: now
      }))
    );

    // Vincular cada agente à respectiva fila
    const users: Array<{ id: number; email: string }> = (await queryInterface.sequelize.query(
      `SELECT id, email FROM \`Users\` WHERE email IN (${sectors
        .map(s => `'${s.user.email}'`)
        .join(",")})`
    ))[0] as any;

    const userQueueRows = sectors
      .map(s => {
        const u = users.find(x => x.email === s.user.email);
        if (!u) return null;
        return {
          userId: u.id,
          queueId: s.id,
          createdAt: now,
          updatedAt: now
        };
      })
      .filter(Boolean) as any[];

    if (userQueueRows.length) {
      await queryInterface.bulkInsert("UserQueues", userQueueRows);
    }
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.bulkDelete("UserQueues", {});
    await queryInterface.bulkDelete("Users", {
      email: sectors.map(s => s.user.email)
    } as any);
    await queryInterface.bulkDelete("Queues", {
      id: sectors.map(s => s.id)
    } as any);
  }
};

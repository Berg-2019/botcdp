import { QueryInterface } from "sequelize";
import { hash } from "bcryptjs";

// Usuário Developer padrão para acesso completo ao painel de desenvolvimento.
// Senha padrão: "dev123" (trocar em produção).

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const passwordHash = await hash("dev123", 8);
    const now = new Date();

    return queryInterface.bulkInsert(
      "Users",
      [
        {
          name: "Developer",
          email: "dev@botcdp.com",
          passwordHash,
          profile: "developer",
          tokenVersion: 0,
          createdAt: now,
          updatedAt: now
        }
      ],
      {}
    );
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.bulkDelete("Users", {
      email: "dev@botcdp.com"
    } as any);
  }
};

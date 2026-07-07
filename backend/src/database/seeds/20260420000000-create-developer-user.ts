import { QueryInterface } from "sequelize";
import { hash } from "bcryptjs";
import { randomBytes } from "crypto";

// Usuário Developer padrão para acesso completo ao painel de desenvolvimento.
// Senha gerada aleatoriamente a cada seed — impressa uma única vez no log
// deste comando. Login força troca de senha no primeiro acesso.

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const password = `${randomBytes(9).toString("base64url").replace(/[-_]/g, "")}Aa1`;
    const passwordHash = await hash(password, 8);
    const now = new Date();

    // eslint-disable-next-line no-console
    console.log(`\n[seed] Senha gerada para dev@botcdp.com: ${password}\n`);

    return queryInterface.bulkInsert(
      "Users",
      [
        {
          name: "Developer",
          email: "dev@botcdp.com",
          passwordHash,
          profile: "developer",
          mustChangePassword: true,
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

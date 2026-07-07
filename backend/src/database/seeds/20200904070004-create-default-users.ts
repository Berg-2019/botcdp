import { QueryInterface } from "sequelize";
import { hash } from "bcryptjs";
import { randomBytes } from "crypto";

// Senha gerada aleatoriamente a cada seed (nunca um valor fixo conhecido) —
// impressa uma única vez no log deste comando para você capturar. Login
// força troca de senha (mustChangePassword) no primeiro acesso.
module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const password = `${randomBytes(9).toString("base64url").replace(/[-_]/g, "")}Aa1`;
    const passwordHash = await hash(password, 8);

    // eslint-disable-next-line no-console
    console.log(`\n[seed] Senha gerada para admin@botcdp.com: ${password}\n`);

    return queryInterface.bulkInsert(
      "Users",
      [
        {
          name: "Administrador",
          email: "admin@botcdp.com",
          passwordHash,
          profile: "admin",
          mustChangePassword: true,
          tokenVersion: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ],
      {}
    );
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.bulkDelete("Users", {});
  }
};

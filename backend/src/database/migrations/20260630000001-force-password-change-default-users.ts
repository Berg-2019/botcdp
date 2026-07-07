import { QueryInterface } from "sequelize";

// Marca as contas seedadas com senha estática e conhecida (admin/admin e
// cdp123 para os 6 agentes setoriais) para forçar troca de senha no
// próximo login — essas credenciais nunca devem ser usadas em produção.
const DEFAULT_CREDENTIAL_EMAILS = [
  "admin@botcdp.com",
  "financeiro@botcdp.com",
  "vendedor.balcao@botcdp.com",
  "vendedor.agricola@botcdp.com",
  "tecnico.mangueira@botcdp.com",
  "tecnico.bateria@botcdp.com",
  "atendente.socorro@botcdp.com"
];

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.bulkUpdate(
      "Users",
      { mustChangePassword: true },
      { email: DEFAULT_CREDENTIAL_EMAILS }
    );
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.bulkUpdate(
      "Users",
      { mustChangePassword: false },
      { email: DEFAULT_CREDENTIAL_EMAILS }
    );
  }
};

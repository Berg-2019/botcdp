import { QueryInterface } from "sequelize";

// Toda mensagem recebida dispara uma busca de Ticket por
// (contactId, whatsappId, status) — sem índice isso vira table scan
// conforme o volume cresce. Mensagens também são sempre buscadas por
// ticketId.
module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addIndex("Tickets", ["contactId", "whatsappId", "status"], {
      name: "tickets_contact_whatsapp_status_idx"
    });
    await queryInterface.addIndex("Messages", ["ticketId"], {
      name: "messages_ticket_id_idx"
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeIndex("Messages", "messages_ticket_id_idx");
    await queryInterface.removeIndex("Tickets", "tickets_contact_whatsapp_status_idx");
  }
};

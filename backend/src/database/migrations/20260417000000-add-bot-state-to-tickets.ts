import { QueryInterface, DataTypes } from "sequelize";

/**
 * Migration: adiciona o estado do fluxo do bot em cada ticket.
 *
 * Contexto: quando uma mensagem chega e o ticket já tem fila associada
 * mas ainda não foi assumido por um atendente humano, o handler executa
 * o BotFlow vinculado à fila (ver ExecuteBotFlowService). Precisamos
 * persistir em que step cada ticket está para que a próxima mensagem
 * do cliente continue o fluxo de onde parou.
 *
 * Campos adicionados:
 * - botFlowId          : fluxo atualmente em execução neste ticket
 * - botStepId          : etapa atual dentro do fluxo
 * - botInvalidAttempts : contador de tentativas de resposta inválidas
 *                        (quando atinge o limite, o bot desiste e libera
 *                        o ticket para atendimento humano)
 */
module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("Tickets", "botFlowId", {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "BotFlows", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL"
    });

    await queryInterface.addColumn("Tickets", "botStepId", {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "BotSteps", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL"
    });

    await queryInterface.addColumn("Tickets", "botInvalidAttempts", {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Tickets", "botInvalidAttempts");
    await queryInterface.removeColumn("Tickets", "botStepId");
    await queryInterface.removeColumn("Tickets", "botFlowId");
  }
};

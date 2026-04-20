import { QueryInterface } from "sequelize";

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.addIndex("BotFlows", ["queueId"], {
      unique: true,
      name: "bot_flows_queue_id_unique"
    });
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.removeIndex("BotFlows", "bot_flows_queue_id_unique");
  }
};

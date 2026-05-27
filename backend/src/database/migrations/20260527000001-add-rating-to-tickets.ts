import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("Tickets", "rating", {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null
    });
    await queryInterface.addColumn("Tickets", "ratingComment", {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Tickets", "ratingComment");
    await queryInterface.removeColumn("Tickets", "rating");
  }
};

import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("Users", "phone", {
      type: DataTypes.STRING(20),
      allowNull: true,
      unique: true,
      defaultValue: null
    });
    await queryInterface.addColumn("Users", "mustChangePassword", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Users", "mustChangePassword");
    await queryInterface.removeColumn("Users", "phone");
  }
};

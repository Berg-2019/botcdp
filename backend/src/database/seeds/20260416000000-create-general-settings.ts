import { QueryInterface } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.bulkInsert("Settings", [
      {
        key: "businessHoursStart",
        value: "08:00",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        key: "businessHoursEnd",
        value: "18:00",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        key: "businessDays",
        value: JSON.stringify([1, 2, 3, 4, 5]),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        key: "outOfHoursMessage",
        value:
          "Nosso horario de atendimento e de segunda a sexta, das 08h as 18h. Deixe sua mensagem que retornaremos assim que possivel.",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        key: "maxOpenTicketsPerAgent",
        value: "5",
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.bulkDelete("Settings", {
      key: [
        "businessHoursStart",
        "businessHoursEnd",
        "businessDays",
        "outOfHoursMessage",
        "maxOpenTicketsPerAgent"
      ]
    });
  }
};

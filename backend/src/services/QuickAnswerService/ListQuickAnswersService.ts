import { Sequelize, Op } from "sequelize";
import QuickAnswer from "../../models/QuickAnswer";

const ListQuickAnswersService = async (
  searchParam?: string
): Promise<QuickAnswer[]> => {
  const whereCondition = searchParam
    ? {
        [Op.or]: [
          Sequelize.where(
            Sequelize.fn("LOWER", Sequelize.col("shortcut")),
            "LIKE",
            `%${searchParam.toLowerCase()}%`
          ),
          Sequelize.where(
            Sequelize.fn("LOWER", Sequelize.col("message")),
            "LIKE",
            `%${searchParam.toLowerCase()}%`
          )
        ]
      }
    : {};

  const quickAnswers = await QuickAnswer.findAll({
    where: whereCondition,
    order: [["shortcut", "ASC"]]
  });

  return quickAnswers;
};

export default ListQuickAnswersService;

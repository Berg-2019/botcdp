import AppError from "../../errors/AppError";
import QuickAnswer from "../../models/QuickAnswer";

const ShowQuickAnswerService = async (
  quickAnswerId: number | string
): Promise<QuickAnswer> => {
  const quickAnswer = await QuickAnswer.findByPk(quickAnswerId);

  if (!quickAnswer) {
    throw new AppError("ERR_QUICK_ANSWER_NOT_FOUND");
  }

  return quickAnswer;
};

export default ShowQuickAnswerService;

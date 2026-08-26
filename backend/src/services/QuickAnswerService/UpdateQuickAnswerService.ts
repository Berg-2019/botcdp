import * as Yup from "yup";
import AppError from "../../errors/AppError";
import QuickAnswer from "../../models/QuickAnswer";
import ShowQuickAnswerService from "./ShowQuickAnswerService";

interface QuickAnswerData {
  shortcut?: string;
  message?: string;
}

const UpdateQuickAnswerService = async (
  quickAnswerId: number | string,
  quickAnswerData: QuickAnswerData
): Promise<QuickAnswer> => {
  const { shortcut, message } = quickAnswerData;

  const schema = Yup.object().shape({
    shortcut: Yup.string().min(1, "ERR_QUICK_ANSWER_INVALID_SHORTCUT"),
    message: Yup.string().min(1, "ERR_QUICK_ANSWER_INVALID_MESSAGE")
  });

  try {
    await schema.validate({ shortcut, message });
  } catch (err) {
    throw new AppError(err.message);
  }

  const quickAnswer = await ShowQuickAnswerService(quickAnswerId);

  await quickAnswer.update(quickAnswerData);

  return quickAnswer;
};

export default UpdateQuickAnswerService;

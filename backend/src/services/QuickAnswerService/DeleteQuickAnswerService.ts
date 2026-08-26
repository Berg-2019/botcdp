import ShowQuickAnswerService from "./ShowQuickAnswerService";

const DeleteQuickAnswerService = async (
  quickAnswerId: number | string
): Promise<void> => {
  const quickAnswer = await ShowQuickAnswerService(quickAnswerId);

  await quickAnswer.destroy();
};

export default DeleteQuickAnswerService;

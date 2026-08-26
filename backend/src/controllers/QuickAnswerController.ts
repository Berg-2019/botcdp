import { Request, Response } from "express";
import CreateQuickAnswerService from "../services/QuickAnswerService/CreateQuickAnswerService";
import DeleteQuickAnswerService from "../services/QuickAnswerService/DeleteQuickAnswerService";
import ListQuickAnswersService from "../services/QuickAnswerService/ListQuickAnswersService";
import UpdateQuickAnswerService from "../services/QuickAnswerService/UpdateQuickAnswerService";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { searchParam } = req.query;

  const quickAnswers = await ListQuickAnswersService(searchParam as string);

  return res.status(200).json(quickAnswers);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { shortcut, message } = req.body;

  const quickAnswer = await CreateQuickAnswerService({ shortcut, message });

  return res.status(200).json(quickAnswer);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { quickAnswerId } = req.params;
  const { shortcut, message } = req.body;

  const quickAnswer = await UpdateQuickAnswerService(quickAnswerId, {
    shortcut,
    message
  });

  return res.status(201).json(quickAnswer);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { quickAnswerId } = req.params;

  await DeleteQuickAnswerService(quickAnswerId);

  return res.status(200).send();
};

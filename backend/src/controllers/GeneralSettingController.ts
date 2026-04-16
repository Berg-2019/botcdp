import { Request, Response } from "express";
import Setting from "../models/Setting";

const SETTING_KEYS = [
  "businessHoursStart",
  "businessHoursEnd",
  "businessDays",
  "outOfHoursMessage",
  "maxOpenTicketsPerAgent"
];

const DEFAULTS: Record<string, string> = {
  businessHoursStart: "08:00",
  businessHoursEnd: "18:00",
  businessDays: JSON.stringify([1, 2, 3, 4, 5]),
  outOfHoursMessage:
    "Nosso horario de atendimento e de segunda a sexta, das 08h as 18h. Deixe sua mensagem que retornaremos assim que possivel.",
  maxOpenTicketsPerAgent: "5"
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const settings: Record<string, any> = {};

  for (const key of SETTING_KEYS) {
    const record = await Setting.findOne({ where: { key } });
    const value = record?.value ?? DEFAULTS[key];

    if (key === "businessDays") {
      settings[key] = JSON.parse(value);
    } else if (key === "maxOpenTicketsPerAgent") {
      settings[key] = parseInt(value, 10);
    } else {
      settings[key] = value;
    }
  }

  return res.json(settings);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const data = req.body;

  for (const key of SETTING_KEYS) {
    if (data[key] !== undefined) {
      const value =
        typeof data[key] === "object"
          ? JSON.stringify(data[key])
          : String(data[key]);

      const [setting] = await Setting.findOrCreate({
        where: { key },
        defaults: { key, value }
      });

      if (setting.value !== value) {
        await setting.update({ value });
      }
    }
  }

  // Return updated settings
  return index(req, res);
};

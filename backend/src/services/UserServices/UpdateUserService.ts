import * as Yup from "yup";

import AppError from "../../errors/AppError";
import { SerializeUser } from "../../helpers/SerializeUser";
import ShowUserService from "./ShowUserService";

interface UserData {
  email?: string;
  password?: string;
  name?: string;
  profile?: string;
  queueIds?: number[];
  whatsappId?: number;
}

interface Request {
  userData: UserData;
  userId: string | number;
}

interface Response {
  id: number;
  name: string;
  email: string;
  profile: string;
}

const UpdateUserService = async ({
  userData,
  userId
}: Request): Promise<Response | undefined> => {
  const user = await ShowUserService(userId);

  const schema = Yup.object().shape({
    name: Yup.string().min(2),
    email: Yup.string().email(),
    profile: Yup.string(),
    password: Yup.string()
  });

  const {
    email,
    password,
    profile,
    name,
    queueIds = [],
    whatsappId
  } = userData;

  try {
    await schema.validate({ email, password, profile, name });
  } catch (err) {
    throw new AppError(err.message);
  }

  const updateData: Record<string, any> = {};
  if (email !== undefined) updateData.email = email;
  if (name !== undefined) updateData.name = name;
  if (profile !== undefined) updateData.profile = profile;
  if (whatsappId !== undefined) updateData.whatsappId = whatsappId ? whatsappId : null;

  await user.update(updateData);

  await user.$set("queues", queueIds);

  await user.reload();

  return SerializeUser(user);
};

export default UpdateUserService;

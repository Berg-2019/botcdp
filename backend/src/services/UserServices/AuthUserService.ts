import User from "../../models/User";
import AppError from "../../errors/AppError";
import {
  createAccessToken,
  createRefreshToken
} from "../../helpers/CreateTokens";
import { SerializeUser } from "../../helpers/SerializeUser";
import normalizePhone from "../../helpers/NormalizePhone";
import Queue from "../../models/Queue";

interface SerializedUser {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  profile: string;
  mustChangePassword: boolean;
  queues: Queue[];
}

interface Request {
  email?: string;
  phone?: string;
  password: string;
}

interface Response {
  serializedUser: SerializedUser;
  token: string;
  refreshToken: string;
}

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

const AuthUserService = async ({
  email,
  phone,
  password
}: Request): Promise<Response> => {
  if (!email && !phone) {
    throw new AppError("ERR_INVALID_CREDENTIALS", 401);
  }

  // Login por número de WhatsApp é o método atual; email é mantido para
  // contas legadas que ainda não migraram para `phone`.
  const user = await User.findOne({
    where: phone ? { phone: normalizePhone(phone) } : { email: email! },
    include: ["queues"]
  });

  if (!user) {
    throw new AppError("ERR_INVALID_CREDENTIALS", 401);
  }

  if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
    const lockoutMs = LOCKOUT_MINUTES * 60 * 1000;
    const timeSinceLastAttempt = Date.now() - new Date(user.updatedAt).getTime();
    if (timeSinceLastAttempt < lockoutMs) {
      const remainingMin = Math.ceil((lockoutMs - timeSinceLastAttempt) / 60000);
      throw new AppError(`Account temporarily locked. Try again in ${remainingMin} minutes.`, 423);
    }
    await user.update({ loginAttempts: 0 });
  }

  if (!(await user.checkPassword(password))) {
    await user.increment("loginAttempts");
    throw new AppError("ERR_INVALID_CREDENTIALS", 401);
  }

  await user.update({ loginAttempts: 0 });

  const token = createAccessToken(user);
  const refreshToken = createRefreshToken(user);

  const serializedUser = SerializeUser(user);

  return {
    serializedUser,
    token,
    refreshToken
  };
};

export default AuthUserService;

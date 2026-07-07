import AppError from "../../errors/AppError";
import User from "../../models/User";

interface Request {
  userId: string | number;
  currentPassword: string;
  newPassword: string;
}

const validateNewPassword = (password: string): void => {
  if (password.length < 8) {
    throw new AppError("Password must be at least 8 characters long");
  }
  if (!/[A-Z]/.test(password)) {
    throw new AppError("Password must contain at least one uppercase letter");
  }
  if (!/[a-z]/.test(password)) {
    throw new AppError("Password must contain at least one lowercase letter");
  }
  if (!/[0-9]/.test(password)) {
    throw new AppError("Password must contain at least one number");
  }
};

// Troca de senha autenticada (usuário já logado), usada tanto para troca
// voluntária quanto para forçar a saída do estado `mustChangePassword`.
const ChangePasswordService = async ({
  userId,
  currentPassword,
  newPassword
}: Request): Promise<{ message: string }> => {
  const user = await User.findByPk(userId);
  if (!user) {
    throw new AppError("ERR_INVALID_CREDENTIALS", 401);
  }

  if (!(await user.checkPassword(currentPassword))) {
    throw new AppError("ERR_INVALID_CREDENTIALS", 401);
  }

  validateNewPassword(newPassword);

  user.password = newPassword;
  user.mustChangePassword = false;
  // Invalida refresh tokens de outras sessões/dispositivos após a troca.
  await user.increment("tokenVersion");
  await user.save();

  return { message: "Password updated successfully" };
};

export default ChangePasswordService;

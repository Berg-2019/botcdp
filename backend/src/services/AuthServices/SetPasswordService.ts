import AppError from "../../errors/AppError";
import { verifyPasswordResetToken } from "../../helpers/GeneratePasswordResetToken";
import User from "../../models/User";

/**
 * Dados esperados para o serviço de redefinição de senha
 */
interface Request {
  token: string;    // Token JWT de reset
  password: string; // Nova senha
}

/**
 * Serviço para redefinir a senha do usuário usando um token válido
 * Valida o token, verifica o usuário e atualiza a senha no banco de dados
 */
const SetPasswordService = async ({ token, password }: Request): Promise<{ message: string }> => {
  // Validação 1: Verifica se token e senha foram fornecidos
  if (!token || !password) {
    throw new AppError("Token and password are required");
  }

  // Validação 2: Verifica o comprimento mínimo da senha
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

  // Validação 3: Verifica e decodifica o token
  const decoded = verifyPasswordResetToken(token);
  if (!decoded) {
    throw new AppError("Invalid or expired token");
  }

  const user = await User.findByPk(decoded.userId);
  if (!user || user.email !== decoded.email) {
    throw new AppError("Invalid or expired token");
  }

  // Atualiza a senha do usuário
  // O hook @BeforeUpdate do modelo User automaticamente faz hash da senha
  user.password = password;
  user.mustChangePassword = false;
  await user.save();

  return { message: "Password updated successfully" };
};

export default SetPasswordService;

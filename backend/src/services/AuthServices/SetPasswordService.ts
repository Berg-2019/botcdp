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
  if (password.length < 5) {
    throw new AppError("Password must be at least 5 characters long");
  }

  // Validação 3: Verifica e decodifica o token
  const decoded = verifyPasswordResetToken(token);
  if (!decoded) {
    throw new AppError("Invalid or expired token");
  }

  // Validação 4: Busca o usuário no banco de dados
  const user = await User.findByPk(decoded.userId);
  if (!user) {
    throw new AppError("User not found");
  }

  // Validação 5: Verifica se o email no token corresponde ao email do usuário
  // Isso evita que alguém use um token de outro usuário
  if (user.email !== decoded.email) {
    throw new AppError("Token does not match user email");
  }

  // Atualiza a senha do usuário
  // O hook @BeforeUpdate do modelo User automaticamente faz hash da senha
  user.password = password;
  await user.save();

  return { message: "Password updated successfully" };
};

export default SetPasswordService;

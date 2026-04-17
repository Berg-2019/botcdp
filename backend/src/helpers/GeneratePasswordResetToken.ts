import jwt from "jsonwebtoken";
import config from "../config/auth";

/**
 * Interface que define a estrutura do payload do token de reset de senha
 */
interface ResetTokenPayload {
  userId: number;      // ID do usuário
  email: string;       // Email do usuário
  type: "password_reset"; // Tipo de token (sempre "password_reset")
}

/**
 * Gera um token JWT para reset de senha
 * @param userId - ID do usuário
 * @param email - Email do usuário
 * @returns Token JWT com expiração de 24 horas
 */
export const generatePasswordResetToken = (userId: number, email: string): string => {
  const payload: ResetTokenPayload = {
    userId,
    email,
    type: "password_reset",
  };

  // Gera o token JWT com expiração de 24 horas
  // Após 24h, o token se torna inválido
  const token = jwt.sign(payload, config.secret, {
    expiresIn: "24h",
  });

  return token;
};

/**
 * Verifica e decodifica um token de reset de senha
 * @param token - Token JWT para validar
 * @returns Payload do token se válido, null caso contrário
 */
export const verifyPasswordResetToken = (token: string): ResetTokenPayload | null => {
  try {
    // Valida o token e decodifica o payload
    const decoded = jwt.verify(token, config.secret) as ResetTokenPayload;
    
    // Verifica se é realmente um token de reset de senha
    if (decoded.type !== "password_reset") {
      return null;
    }
    
    return decoded;
  } catch (err) {
    // Se houver erro (token expirado, inválido, etc), retorna null
    return null;
  }
};

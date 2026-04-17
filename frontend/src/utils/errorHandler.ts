/**
 * Utilitário para extrair mensagens de erro de diferentes fontes
 * Trata erros do backend, validação, rede, etc.
 */

export interface ApiError {
  message: string;
  statusCode?: number;
  type?: string;
}

/**
 * Extrai mensagem de erro de diferentes tipos de erro
 * Suporta: erro de resposta JSON, AppError do backend, erro de rede, etc.
 */
export function extractErrorMessage(error: unknown): string {
  // Se for uma string simples
  if (typeof error === 'string') {
    return error;
  }

  // Se for um objeto com propriedade message
  if (error && typeof error === 'object') {
    const err = error as Record<string, any>;

    // Erro de resposta JSON (backend retorna JSON com mensagem)
    if (err.message) {
      // Se for um JSON stringificado, tenta fazer parse
      try {
        if (typeof err.message === 'string' && err.message.startsWith('{')) {
          const parsed = JSON.parse(err.message);
          return parsed.message || err.message;
        }
      } catch {
        // Se não conseguir fazer parse, usa a mensagem como está
      }
      return err.message;
    }

    // Erro com campo 'error'
    if (err.error) {
      if (typeof err.error === 'object' && err.error.message) {
        return err.error.message;
      }
      return String(err.error);
    }

    // Erro com campo 'errors' (array)
    if (Array.isArray(err.errors) && err.errors.length > 0) {
      if (typeof err.errors[0] === 'string') {
        return err.errors[0];
      }
      if (err.errors[0].message) {
        return err.errors[0].message;
      }
    }
  }

  // Se for Error nativo do JavaScript
  if (error instanceof Error) {
    return error.message;
  }

  // Fallback
  return 'Ocorreu um erro desconhecido';
}

/**
 * Mapeia códigos de erro comuns para mensagens em português
 */
export const ERROR_MESSAGES: Record<string, string> = {
  'ERR_NO_PERMISSION': 'Você não tem permissão para realizar essa ação. Apenas administradores ou desenvolvedores podem gerenciar usuários.',
  'ERR_USER_CREATION_DISABLED': 'A criação de usuários está desabilitada',
  'ERR_SESSION_EXPIRED': 'Sua sessão expirou, faça login novamente',
  'ERR_INVALID_EMAIL': 'Email inválido',
  'ERR_USER_EXISTS': 'Esse email já está registrado no sistema',
  'ERR_INVALID_PASSWORD': 'A senha não atende aos requisitos (mínimo 6 caracteres)',
  'ERR_MISSING_FIELDS': 'Preencha todos os campos obrigatórios',
  'Unauthorized or Forbidden': 'Você não tem permissão para realizar essa ação',
};

/**
 * Converte um código ou mensagem de erro em uma mensagem amigável
 */
export function getReadableErrorMessage(error: unknown): string {
  const originalMessage = extractErrorMessage(error);

  // Procura por mensagens conhecidas
  for (const [code, message] of Object.entries(ERROR_MESSAGES)) {
    if (originalMessage.includes(code)) {
      return message;
    }
  }

  // Se contém 403, provavelmente é permissão
  if (originalMessage.includes('403')) {
    return 'Você não tem permissão para realizar essa ação';
  }

  // Se contiver 401, é autenticação
  if (originalMessage.includes('401')) {
    return 'Sua sessão expirou, faça login novamente';
  }

  // Se for mensagem muito técnica, simplifica
  if (originalMessage.length > 100) {
    return 'Ocorreu um erro ao processar sua requisição';
  }

  return originalMessage;
}

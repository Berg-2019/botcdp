import { logger } from "../utils/logger";

interface RetryOptions {
  attempts?: number;
  delayMs?: number;
  label?: string;
}

const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => {
    setTimeout(resolve, ms);
  });

// Reexecuta `fn` em caso de falha (ex.: deadlock ou pool de conexões do
// banco esgotado momentaneamente), em vez de perder a mensagem do cliente
// na primeira falha transitória.
const withRetry = async <T>(
  fn: () => Promise<T>,
  { attempts = 3, delayMs = 300, label = "operation" }: RetryOptions = {}
): Promise<T> => {
  let lastErr: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      // eslint-disable-next-line no-await-in-loop
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < attempts) {
        logger.warn(
          `${label}: tentativa ${attempt}/${attempts} falhou, tentando novamente em ${delayMs *
            attempt}ms`
        );
        // eslint-disable-next-line no-await-in-loop
        await sleep(delayMs * attempt);
      }
    }
  }

  throw lastErr;
};

export default withRetry;

/**
 * Retry Policy with Exponential Backoff
 * Implements retry logic with configurable backoff strategies
 */

export interface RetryOptions {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs?: number;
  multiplier?: number; // Exponential backoff multiplier (default: 2)
  strategy?: 'exponential' | 'linear' | 'fixed';
  jitter?: boolean; // Add random jitter to prevent thundering herd
  retryableErrors?: (error: Error) => boolean; // Determine if error is retryable
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  multiplier: 2,
  strategy: 'exponential',
  jitter: true,
  retryableErrors: (error: Error) => {
    // Retry on network errors, timeouts, and 5xx errors
    const message = error.message.toLowerCase();
    return (
      message.includes('timeout') ||
      message.includes('network') ||
      message.includes('connection') ||
      message.includes('econnrefused') ||
      message.includes('etimedout') ||
      message.includes('eai_again')
    );
  }
};

export class RetryableError extends Error {
  constructor(message: string, public readonly retryable: boolean = true) {
    super(message);
    this.name = 'RetryableError';
  }
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options?: Partial<RetryOptions>
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Check if error is retryable
      if (!opts.retryableErrors(error as Error)) {
        throw error;
      }
      
      // Don't delay after last attempt
      if (attempt === opts.maxAttempts) {
        break;
      }
      
      // Calculate delay
      const delay = calculateDelay(attempt, opts);
      
      // Wait before retry
      await sleep(delay);
    }
  }
  
  throw lastError || new Error('Retry exhausted');
}

function calculateDelay(attempt: number, options: Required<RetryOptions>): number {
  let delay: number;
  
  switch (options.strategy) {
    case 'fixed':
      delay = options.initialDelayMs;
      break;
    case 'linear':
      delay = options.initialDelayMs * attempt;
      break;
    case 'exponential':
    default:
      delay = options.initialDelayMs * Math.pow(options.multiplier, attempt - 1);
      break;
  }
  
  // Apply max delay cap
  delay = Math.min(delay, options.maxDelayMs);
  
  // Add jitter (random variation to prevent thundering herd)
  if (options.jitter) {
    const jitterRange = delay * 0.1; // 10% jitter
    const jitter = (Math.random() * 2 - 1) * jitterRange; // -10% to +10%
    delay = Math.max(0, delay + jitter);
  }
  
  return Math.floor(delay);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a retry decorator for async functions
 */
export function withRetry<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options?: Partial<RetryOptions>
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    return retry(() => fn(...args), options);
  }) as T;
}


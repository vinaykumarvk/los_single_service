/**
 * Circuit Breaker Implementation
 * Prevents cascading failures by opening circuit after failure threshold
 */

export interface CircuitBreakerOptions {
  failureThreshold: number; // Open circuit after N failures
  resetTimeout: number; // Milliseconds before attempting to reset
  monitoringPeriod: number; // Milliseconds to track failures
  halfOpenMaxAttempts?: number; // Max attempts in half-open state
}

export enum CircuitState {
  CLOSED = 'CLOSED', // Normal operation
  OPEN = 'OPEN', // Circuit is open, reject requests
  HALF_OPEN = 'HALF_OPEN' // Testing if service recovered
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private halfOpenAttempts: number = 0;
  
  constructor(
    private name: string,
    private options: CircuitBreakerOptions
  ) {
    if (options.failureThreshold < 1) {
      throw new Error('failureThreshold must be at least 1');
    }
    if (options.resetTimeout < 100) {
      throw new Error('resetTimeout must be at least 100ms');
    }
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;
      if (timeSinceLastFailure >= this.options.resetTimeout) {
        // Transition to half-open
        this.state = CircuitState.HALF_OPEN;
        this.halfOpenAttempts = 0;
      } else {
        throw new CircuitBreakerOpenError(`Circuit breaker ${this.name} is OPEN`);
      }
    }

    try {
      const result = await fn();
      
      // Success - reset failure count
      if (this.state === CircuitState.HALF_OPEN) {
        // Success in half-open - close circuit
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
        this.halfOpenAttempts = 0;
      } else {
        // Success in closed - reset counter periodically
        const timeSinceLastFailure = Date.now() - this.lastFailureTime;
        if (timeSinceLastFailure >= this.options.monitoringPeriod) {
          this.failureCount = 0;
        }
      }
      
      return result;
    } catch (error) {
      this.handleFailure();
      throw error;
    }
  }

  private handleFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      this.halfOpenAttempts++;
      const maxAttempts = this.options.halfOpenMaxAttempts || 1;
      if (this.halfOpenAttempts >= maxAttempts) {
        // Still failing - reopen circuit
        this.state = CircuitState.OPEN;
        this.halfOpenAttempts = 0;
      }
    } else if (this.failureCount >= this.options.failureThreshold) {
      // Too many failures - open circuit
      this.state = CircuitState.OPEN;
    }
  }

  getState(): CircuitState {
    // Auto-transition from OPEN to HALF_OPEN if timeout passed
    if (this.state === CircuitState.OPEN) {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;
      if (timeSinceLastFailure >= this.options.resetTimeout) {
        this.state = CircuitState.HALF_OPEN;
        this.halfOpenAttempts = 0;
      }
    }
    return this.state;
  }

  getStats() {
    return {
      name: this.name,
      state: this.getState(),
      failureCount: this.failureCount,
      halfOpenAttempts: this.halfOpenAttempts,
      lastFailureTime: this.lastFailureTime
    };
  }

  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.halfOpenAttempts = 0;
    this.lastFailureTime = 0;
  }
}

export class CircuitBreakerOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitBreakerOpenError';
  }
}

// Global registry for circuit breakers
const circuitBreakers = new Map<string, CircuitBreaker>();

/**
 * Get or create a circuit breaker
 */
export function getCircuitBreaker(
  name: string,
  options: CircuitBreakerOptions
): CircuitBreaker {
  if (!circuitBreakers.has(name)) {
    circuitBreakers.set(name, new CircuitBreaker(name, options));
  }
  return circuitBreakers.get(name)!;
}


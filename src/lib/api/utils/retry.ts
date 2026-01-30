/**
 * Retry utility for handling transient failures and rate limits
 */

import { RateLimitError, APIError } from '../errors/apiErrors'

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number
  /** Base delay in ms for exponential backoff (default: 1000) */
  baseDelayMs?: number
  /** Maximum delay in ms (default: 30000) */
  maxDelayMs?: number
  /** Jitter factor 0-1 to randomize delays (default: 0.1) */
  jitterFactor?: number
  /** Status codes that should trigger a retry (default: [429, 500, 502, 503, 504]) */
  retryableStatusCodes?: number[]
  /** Callback for retry events */
  onRetry?: (attempt: number, delay: number, error: Error) => void
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'onRetry'>> = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  jitterFactor: 0.1,
  retryableStatusCodes: [429, 500, 502, 503, 504],
}

/**
 * Check if an error is retryable
 */
function isRetryable(error: unknown, options: Required<Omit<RetryOptions, 'onRetry'>>): boolean {
  if (error instanceof RateLimitError) {
    return true
  }

  if (error instanceof APIError) {
    return options.retryableStatusCodes.includes(error.statusCode)
  }

  // Check for fetch errors that might be transient
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    if (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('econnreset') ||
      message.includes('econnrefused') ||
      message.includes('socket hang up')
    ) {
      return true
    }
  }

  return false
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(
  attempt: number,
  options: Required<Omit<RetryOptions, 'onRetry'>>,
  retryAfter?: number
): number {
  // If rate limit error provides retry-after, use that
  if (retryAfter && retryAfter > 0) {
    return Math.min(retryAfter * 1000, options.maxDelayMs)
  }

  // Exponential backoff: delay = baseDelay * 2^attempt
  const exponentialDelay = options.baseDelayMs * Math.pow(2, attempt)

  // Add jitter to prevent thundering herd
  const jitter = exponentialDelay * options.jitterFactor * Math.random()
  const delayWithJitter = exponentialDelay + jitter

  return Math.min(delayWithJitter, options.maxDelayMs)
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Execute a function with automatic retry on failure
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts: Required<Omit<RetryOptions, 'onRetry'>> = {
    ...DEFAULT_OPTIONS,
    ...options,
  }

  let lastError: Error | undefined

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Check if we've exhausted retries
      if (attempt >= opts.maxRetries) {
        throw lastError
      }

      // Check if error is retryable
      if (!isRetryable(error, opts)) {
        throw lastError
      }

      // Calculate delay
      const retryAfter = error instanceof RateLimitError ? error.retryAfter : undefined
      const delay = calculateDelay(attempt, opts, retryAfter)

      // Notify about retry
      options.onRetry?.(attempt + 1, delay, lastError)

      // Wait before retrying
      await sleep(delay)
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError ?? new Error('Retry failed')
}

/**
 * Create a fetch wrapper with retry support
 */
export function createFetchWithRetry(options: RetryOptions = {}): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    return withRetry(async () => {
      const response = await fetch(input, init)

      // Check for retryable status codes
      if (!response.ok) {
        const statusCode = response.status
        const opts = { ...DEFAULT_OPTIONS, ...options }

        if (opts.retryableStatusCodes.includes(statusCode)) {
          // Try to get retry-after header
          const retryAfter = response.headers.get('retry-after')
          const retryAfterMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : undefined

          if (statusCode === 429) {
            throw new RateLimitError('fetch' as any, retryAfterMs ? retryAfterMs / 1000 : undefined)
          }

          throw new APIError(
            `Request failed with status ${statusCode}`,
            statusCode,
            'HTTP_ERROR'
          )
        }
      }

      return response
    }, options)
  }
}

/**
 * Retry decorator for class methods
 */
export function Retry(options: RetryOptions = {}) {
  return function (
    _target: object,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: unknown[]) {
      return withRetry(() => originalMethod.apply(this, args), options)
    }

    return descriptor
  }
}

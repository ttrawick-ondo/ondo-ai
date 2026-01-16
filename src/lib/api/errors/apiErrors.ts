import type { AIProvider } from '@/types'

export class APIError extends Error {
  public readonly statusCode: number
  public readonly code: string
  public readonly details?: Record<string, unknown>

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'APIError'
    this.statusCode = statusCode
    this.code = code
    this.details = details
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
    }
  }
}

export class ProviderNotConfiguredError extends APIError {
  public readonly provider: AIProvider

  constructor(provider: AIProvider) {
    super(
      `Provider ${provider} is not configured. Please set the required environment variables.`,
      503,
      'PROVIDER_NOT_CONFIGURED',
      { provider }
    )
    this.name = 'ProviderNotConfiguredError'
    this.provider = provider
  }
}

export class ProviderNotFoundError extends APIError {
  public readonly provider: string

  constructor(provider: string) {
    super(
      `Provider ${provider} is not recognized`,
      400,
      'PROVIDER_NOT_FOUND',
      { provider }
    )
    this.name = 'ProviderNotFoundError'
    this.provider = provider
  }
}

export class ModelNotFoundError extends APIError {
  public readonly model: string
  public readonly provider: AIProvider

  constructor(model: string, provider: AIProvider) {
    super(
      `Model ${model} is not available for provider ${provider}`,
      400,
      'MODEL_NOT_FOUND',
      { model, provider }
    )
    this.name = 'ModelNotFoundError'
    this.model = model
    this.provider = provider
  }
}

export class RateLimitError extends APIError {
  public readonly provider: AIProvider
  public readonly retryAfter?: number

  constructor(provider: AIProvider, retryAfter?: number) {
    super(
      `Rate limit exceeded for provider ${provider}`,
      429,
      'RATE_LIMIT_EXCEEDED',
      { provider, retryAfter }
    )
    this.name = 'RateLimitError'
    this.provider = provider
    this.retryAfter = retryAfter
  }
}

export class AuthenticationError extends APIError {
  public readonly provider: AIProvider

  constructor(provider: AIProvider) {
    super(
      `Authentication failed for provider ${provider}. Please check your API key.`,
      401,
      'AUTHENTICATION_FAILED',
      { provider }
    )
    this.name = 'AuthenticationError'
    this.provider = provider
  }
}

export class StreamingError extends APIError {
  constructor(message: string) {
    super(message, 500, 'STREAMING_ERROR')
    this.name = 'StreamingError'
  }
}

export class ValidationError extends APIError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 400, 'VALIDATION_ERROR', details)
    this.name = 'ValidationError'
  }
}

export function handleProviderError(
  error: unknown,
  provider: AIProvider
): APIError {
  if (error instanceof APIError) {
    return error
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase()

    if (message.includes('rate limit') || message.includes('too many requests')) {
      return new RateLimitError(provider)
    }

    if (
      message.includes('unauthorized') ||
      message.includes('invalid api key') ||
      message.includes('authentication')
    ) {
      return new AuthenticationError(provider)
    }

    return new APIError(
      `Provider ${provider} error: ${error.message}`,
      500,
      'PROVIDER_ERROR',
      { provider, originalError: error.message }
    )
  }

  return new APIError(
    `Unknown error from provider ${provider}`,
    500,
    'UNKNOWN_ERROR',
    { provider }
  )
}

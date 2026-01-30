import * as Sentry from '@sentry/nextjs'

export interface ErrorContext {
  userId?: string
  conversationId?: string
  projectId?: string
  requestId?: string
  tags?: Record<string, string>
  extra?: Record<string, unknown>
}

/**
 * Capture an exception with additional context
 */
export function captureException(error: Error, context?: ErrorContext): string {
  return Sentry.captureException(error, (scope) => {
    if (context?.userId) {
      scope.setUser({ id: context.userId })
    }

    if (context?.conversationId) {
      scope.setTag('conversationId', context.conversationId)
    }

    if (context?.projectId) {
      scope.setTag('projectId', context.projectId)
    }

    if (context?.requestId) {
      scope.setTag('requestId', context.requestId)
    }

    if (context?.tags) {
      for (const [key, value] of Object.entries(context.tags)) {
        scope.setTag(key, value)
      }
    }

    if (context?.extra) {
      for (const [key, value] of Object.entries(context.extra)) {
        scope.setExtra(key, value)
      }
    }

    return scope
  })
}

/**
 * Capture a message with additional context
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: ErrorContext
): string {
  return Sentry.captureMessage(message, (scope) => {
    scope.setLevel(level)

    if (context?.userId) {
      scope.setUser({ id: context.userId })
    }

    if (context?.conversationId) {
      scope.setTag('conversationId', context.conversationId)
    }

    if (context?.tags) {
      for (const [key, value] of Object.entries(context.tags)) {
        scope.setTag(key, value)
      }
    }

    if (context?.extra) {
      for (const [key, value] of Object.entries(context.extra)) {
        scope.setExtra(key, value)
      }
    }

    return scope
  })
}

/**
 * Set user context for error tracking
 */
export function setUser(user: { id: string; email?: string; name?: string } | null): void {
  Sentry.setUser(user)
}

/**
 * Add breadcrumb for error context
 */
export function addBreadcrumb(breadcrumb: Sentry.Breadcrumb): void {
  Sentry.addBreadcrumb(breadcrumb)
}

/**
 * Start a transaction for performance monitoring
 */
export function startTransaction(
  name: string,
  op: string,
  context?: Record<string, string | number | boolean | undefined>
): Sentry.Span | undefined {
  return Sentry.startInactiveSpan({
    name,
    op,
    attributes: context,
  })
}

/**
 * Wrap an async function with Sentry error capture
 */
export async function withErrorCapture<T>(
  fn: () => Promise<T>,
  context?: ErrorContext
): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    if (error instanceof Error) {
      captureException(error, context)
    }
    throw error
  }
}

/**
 * Create a Sentry-wrapped API handler
 */
export function withSentryAPIHandler<T>(
  handler: () => Promise<T>,
  context?: ErrorContext
): Promise<T> {
  return Sentry.withScope(async (scope) => {
    if (context?.requestId) {
      scope.setTag('requestId', context.requestId)
    }
    if (context?.userId) {
      scope.setUser({ id: context.userId })
    }
    if (context?.conversationId) {
      scope.setTag('conversationId', context.conversationId)
    }

    try {
      return await handler()
    } catch (error) {
      if (error instanceof Error) {
        Sentry.captureException(error)
      }
      throw error
    }
  })
}

export default Sentry

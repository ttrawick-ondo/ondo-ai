import pino from 'pino'

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'

export interface LogContext {
  requestId?: string
  userId?: string
  conversationId?: string
  projectId?: string
  modelId?: string
  provider?: string
  [key: string]: unknown
}

// Determine log level based on environment
function getLogLevel(): LogLevel {
  const level = process.env.LOG_LEVEL as LogLevel
  if (level && ['trace', 'debug', 'info', 'warn', 'error', 'fatal'].includes(level)) {
    return level
  }
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug'
}

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined'

// Check if we're running in Next.js (server-side rendering or API routes)
// pino-pretty uses worker threads which causes issues with Next.js webpack bundling
// NEXT_RUNTIME is set by Next.js in both 'nodejs' and 'edge' runtimes
const isNextJs = typeof process !== 'undefined' &&
  (process.env.NEXT_RUNTIME === 'nodejs' || process.env.NEXT_RUNTIME === 'edge' || !!process.env.__NEXT_PROCESSED_ENV)

// Determine if we should use pretty printing
// Only use in development, not in browser, and not when bundled by Next.js
// This avoids worker thread issues with Next.js webpack bundling
function shouldUsePrettyPrint(): boolean {
  if (isBrowser || isNextJs) {
    return false
  }
  return process.env.NODE_ENV !== 'production' && process.env.LOG_PRETTY !== 'false'
}

// Create the base pino logger
const baseLogger = pino({
  level: getLogLevel(),
  // Only use transport in non-webpack environments (like standalone Node.js scripts)
  // In Next.js, we use plain JSON logging to avoid worker thread issues
  transport: shouldUsePrettyPrint()
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  // Use browser-friendly config when in browser
  browser: isBrowser ? { asObject: true } : undefined,
  // Custom serializers for sensitive data
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      headers: {
        'user-agent': req.headers?.['user-agent'],
        'content-type': req.headers?.['content-type'],
      },
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
    err: pino.stdSerializers.err,
  },
  // Redact sensitive fields
  redact: {
    paths: [
      'password',
      'apiKey',
      'token',
      'secret',
      'authorization',
      'req.headers.authorization',
      '*.password',
      '*.apiKey',
      '*.token',
      '*.secret',
    ],
    censor: '[REDACTED]',
  },
  // Include timestamps
  timestamp: pino.stdTimeFunctions.isoTime,
})

// Logger class with context support
class Logger {
  private pinoLogger: pino.Logger
  private context: LogContext

  constructor(logger: pino.Logger, context: LogContext = {}) {
    this.pinoLogger = logger
    this.context = context
  }

  // Create a child logger with additional context
  child(context: LogContext): Logger {
    const mergedContext = { ...this.context, ...context }
    return new Logger(this.pinoLogger.child(mergedContext), mergedContext)
  }

  // Log methods
  trace(message: string, data?: Record<string, unknown>): void {
    this.pinoLogger.trace(data, message)
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.pinoLogger.debug(data, message)
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.pinoLogger.info(data, message)
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.pinoLogger.warn(data, message)
  }

  error(message: string, error?: Error | Record<string, unknown>): void {
    if (error instanceof Error) {
      this.pinoLogger.error({ err: error }, message)
    } else {
      this.pinoLogger.error(error, message)
    }
  }

  fatal(message: string, error?: Error | Record<string, unknown>): void {
    if (error instanceof Error) {
      this.pinoLogger.fatal({ err: error }, message)
    } else {
      this.pinoLogger.fatal(error, message)
    }
  }

  // Performance timing helper
  startTimer(label: string): () => void {
    const start = Date.now()
    return () => {
      const duration = Date.now() - start
      this.debug(`${label} completed`, { duration, durationMs: duration })
    }
  }
}

// Export the main logger instance
export const logger = new Logger(baseLogger)

// Export function to create child loggers with context
export function createLogger(context: LogContext): Logger {
  return logger.child(context)
}

// Specialized loggers for different subsystems
export const apiLogger = logger.child({ component: 'api' })
export const chatLogger = logger.child({ component: 'chat' })
export const toolLogger = logger.child({ component: 'tools' })
export const agentLogger = logger.child({ component: 'agent' })
export const dbLogger = logger.child({ component: 'database' })

// Middleware-style request logging helper
export function logRequest(
  requestId: string,
  method: string,
  url: string,
  userId?: string
): Logger {
  const requestLogger = apiLogger.child({
    requestId,
    method,
    url,
    userId,
  })
  requestLogger.info('Request started')
  return requestLogger
}

// Helper to log chat completions
export interface ChatCompletionLogData {
  provider: string
  model: string
  inputTokens?: number
  outputTokens?: number
  duration?: number
  toolCalls?: number
  success: boolean
  error?: string
}

export function logChatCompletion(
  conversationId: string,
  data: ChatCompletionLogData
): void {
  const logData = {
    conversationId,
    ...data,
  }

  if (data.success) {
    chatLogger.info('Chat completion succeeded', logData)
  } else {
    chatLogger.error('Chat completion failed', logData)
  }
}

// Helper to log tool executions
export interface ToolExecutionLogData {
  toolName: string
  duration: number
  success: boolean
  error?: string
}

export function logToolExecution(
  conversationId: string,
  data: ToolExecutionLogData
): void {
  const logData = {
    conversationId,
    ...data,
  }

  if (data.success) {
    toolLogger.debug('Tool executed', logData)
  } else {
    toolLogger.warn('Tool execution failed', logData)
  }
}

// Helper to log agent activities
export interface AgentLogData {
  agentRole: string
  taskId: string
  event: string
  iteration?: number
  toolName?: string
  success?: boolean
  error?: string
}

export function logAgentActivity(data: AgentLogData): void {
  const logLevel = data.event === 'failed' ? 'error' : 'info'
  agentLogger[logLevel](`Agent ${data.event}`, { ...data })
}

export default logger

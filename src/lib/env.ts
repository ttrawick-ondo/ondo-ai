/**
 * Environment Configuration
 * Centralized, type-safe access to environment variables
 */

import { z } from 'zod'

const serverEnvSchema = z.object({
  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DATABASE_AUTH_TOKEN: z.string().optional(),

  // AI Providers
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),

  // Glean
  GLEAN_API_KEY: z.string().optional(),
  GLEAN_API_URL: z.string().url().optional().default('https://api.glean.com/api/v1'),

  // External Services
  TAVILY_API_KEY: z.string().optional(),
  ACTIONS_API_KEY: z.string().optional(),
  ONDOBOT_API_KEY: z.string().optional(),
  ONDOBOT_API_URL: z.string().url().optional(),

  // Routing
  ROUTING_MODE: z.enum(['rule_based', 'llm_hybrid']).default('rule_based'),
  ROUTING_CONFIDENCE_THRESHOLD: z.string().default('0.7').transform(Number).pipe(z.number().min(0).max(1)),
  ENABLE_AUTO_ROUTING: z.string().default('false').transform((v) => v === 'true'),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).optional(),
  LOG_PRETTY: z.string().default('true').transform((v) => v !== 'false'),

  // Sentry
  SENTRY_DSN: z.string().optional(),
  APP_VERSION: z.string().optional(),

  // Auth (for future Okta integration)
  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().optional(),
  OKTA_CLIENT_ID: z.string().optional(),
  OKTA_CLIENT_SECRET: z.string().optional(),
  OKTA_ISSUER: z.string().url().optional(),
})

const clientEnvSchema = z.object({
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  NEXT_PUBLIC_APP_VERSION: z.string().optional(),
})

export type ServerEnv = z.infer<typeof serverEnvSchema>
export type ClientEnv = z.infer<typeof clientEnvSchema>

function getServerEnv(): ServerEnv {
  const parsed = serverEnvSchema.safeParse(process.env)

  if (!parsed.success) {
    console.error('Invalid environment variables:')
    console.error(parsed.error.flatten().fieldErrors)
    throw new Error('Invalid environment variables')
  }

  return parsed.data
}

function getClientEnv(): ClientEnv {
  const parsed = clientEnvSchema.safeParse({
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION,
  })

  if (!parsed.success) {
    console.error('Invalid client environment variables:')
    console.error(parsed.error.flatten().fieldErrors)
    throw new Error('Invalid client environment variables')
  }

  return parsed.data
}

// Lazy initialization to avoid issues during build
let _serverEnv: ServerEnv | null = null
let _clientEnv: ClientEnv | null = null

export const env = {
  get server(): ServerEnv {
    if (!_serverEnv) {
      _serverEnv = getServerEnv()
    }
    return _serverEnv
  },
  get client(): ClientEnv {
    if (!_clientEnv) {
      _clientEnv = getClientEnv()
    }
    return _clientEnv
  },
}

// Feature flags based on env
export const features = {
  get gleanEnabled(): boolean {
    return !!process.env.GLEAN_API_KEY
  },
  get openaiEnabled(): boolean {
    return !!process.env.OPENAI_API_KEY
  },
  get anthropicEnabled(): boolean {
    return !!process.env.ANTHROPIC_API_KEY
  },
  get autoRoutingEnabled(): boolean {
    return process.env.ENABLE_AUTO_ROUTING === 'true'
  },
  get sentryEnabled(): boolean {
    return !!process.env.SENTRY_DSN
  },
}

// Helper to check required providers
export function validateRequiredProviders(required: ('openai' | 'anthropic' | 'glean')[]): void {
  const missing: string[] = []

  for (const provider of required) {
    switch (provider) {
      case 'openai':
        if (!features.openaiEnabled) missing.push('OPENAI_API_KEY')
        break
      case 'anthropic':
        if (!features.anthropicEnabled) missing.push('ANTHROPIC_API_KEY')
        break
      case 'glean':
        if (!features.gleanEnabled) missing.push('GLEAN_API_KEY')
        break
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing required API keys: ${missing.join(', ')}`)
  }
}

/**
 * Database Client Singleton
 *
 * Provides a single Prisma client instance across the application.
 * In development, the client is cached on globalThis to survive HMR.
 *
 * Uses CockroachDB (PostgreSQL-compatible) via Prisma with pg adapter.
 */

import { PrismaClient } from '@/generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

// Extend globalThis to cache the Prisma client in development
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
}

/**
 * Get or create the Prisma client instance
 */
function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required')
  }

  const pool = new Pool({ connectionString })
  const adapter = new PrismaPg(pool)

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
  })
}

// Use cached client in development to prevent creating multiple clients during HMR
const prisma = globalThis.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma
}

export { prisma }
export type { PrismaClient }

// Re-export commonly used Prisma types
export type {
  User,
  Workspace,
  WorkspaceMember,
  WorkspaceInvitation,
  Project,
  Folder,
  Conversation,
  Message,
  Prompt,
  ApiKey,
  AgentTask,
  AgentTaskEvent,
  UsageRecord,
} from '@/generated/prisma'

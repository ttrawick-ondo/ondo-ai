/**
 * Database Client Singleton
 *
 * Provides a single Prisma client instance across the application.
 * In development, the client is cached on globalThis to survive HMR.
 *
 * Uses Prisma 7 with libSQL adapter for SQLite.
 */

import { PrismaClient } from '@/generated/prisma'
import { PrismaLibSql } from '@prisma/adapter-libsql'

// Extend globalThis to cache the Prisma client in development
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
}

/**
 * Get or create the Prisma client instance
 */
function createPrismaClient(): PrismaClient {
  // Get database URL from environment
  const databaseUrl = process.env.DATABASE_URL || 'file:./dev.db'

  // Create Prisma adapter factory
  const adapter = new PrismaLibSql({
    url: databaseUrl,
  })

  // Create Prisma client with adapter
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
  Conversation,
  Message,
  Prompt,
  ApiKey,
  AgentTask,
  AgentTaskEvent,
  UsageRecord,
} from '@/generated/prisma'

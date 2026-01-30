/**
 * Database Client Singleton
 *
 * Provides a single Prisma client instance across the application.
 * In development, the client is cached on globalThis to survive HMR.
 *
 * Uses Prisma with libSQL adapter for both local SQLite files
 * and remote Turso databases.
 */

import { PrismaClient } from '@/generated/prisma'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import path from 'path'

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
  let databaseUrl = process.env.DATABASE_URL || 'file:./dev.db'

  // For local SQLite files, convert relative path to absolute for libSQL
  if (databaseUrl.startsWith('file:')) {
    const filePath = databaseUrl.replace('file:', '')
    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.join(process.cwd(), filePath)
    databaseUrl = `file:${absolutePath}`
  }

  // Create libSQL adapter
  const adapter = new PrismaLibSql({
    url: databaseUrl,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  })

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

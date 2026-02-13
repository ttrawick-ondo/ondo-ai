/**
 * User Database Service
 *
 * Handles user and authentication operations.
 */

import { prisma } from '../index'
import type { User, Workspace, WorkspaceMember } from '@/generated/prisma'

export interface UserSettings {
  theme?: 'light' | 'dark' | 'system'
  defaultModel?: string
  defaultProvider?: string
  notifications?: {
    email?: boolean
    push?: boolean
  }
}

export interface CreateUserInput {
  email: string
  name?: string
  avatar?: string
  role?: 'user' | 'admin'
  settings?: UserSettings
}

export interface UpdateUserInput {
  name?: string
  avatar?: string
  settings?: UserSettings
}

export interface UserWithWorkspaces extends User {
  workspaces: (WorkspaceMember & { workspace: Workspace })[]
}

// ============================================================================
// Users
// ============================================================================

export async function createUser(input: CreateUserInput): Promise<User> {
  return prisma.user.create({
    data: {
      email: input.email,
      name: input.name,
      avatar: input.avatar,
      role: input.role ?? 'user',
      settings: input.settings ? JSON.stringify(input.settings) : null,
    },
  })
}

export async function getUser(id: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { id },
  })
}

export async function getUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { email },
  })
}

export async function getUserWithWorkspaces(
  id: string
): Promise<UserWithWorkspaces | null> {
  return prisma.user.findUnique({
    where: { id },
    include: {
      workspaces: {
        include: {
          workspace: true,
        },
      },
    },
  })
}

export async function updateUser(id: string, data: UpdateUserInput): Promise<User> {
  return prisma.user.update({
    where: { id },
    data: {
      name: data.name,
      avatar: data.avatar,
      settings: data.settings ? JSON.stringify(data.settings) : undefined,
    },
  })
}

export async function updateUserSettings(
  id: string,
  settings: UserSettings
): Promise<User> {
  const user = await getUser(id)
  if (!user) {
    throw new Error('User not found')
  }

  const currentSettings: UserSettings = user.settings
    ? JSON.parse(user.settings)
    : {}

  return prisma.user.update({
    where: { id },
    data: {
      settings: JSON.stringify({ ...currentSettings, ...settings }),
    },
  })
}

export async function updateLastLogin(id: string): Promise<User> {
  return prisma.user.update({
    where: { id },
    data: { lastLoginAt: new Date() },
  })
}

export async function deleteUser(id: string): Promise<void> {
  await prisma.user.delete({
    where: { id },
  })
}

// ============================================================================
// User Settings Helpers
// ============================================================================

export function parseUserSettings(user: User): UserSettings {
  if (!user.settings) return {}
  try {
    return JSON.parse(user.settings) as UserSettings
  } catch {
    return {}
  }
}

export async function getUserDefaultModel(id: string): Promise<{
  model: string
  provider: string
} | null> {
  const user = await getUser(id)
  if (!user) return null

  const settings = parseUserSettings(user)
  if (settings.defaultModel && settings.defaultProvider) {
    return {
      model: settings.defaultModel,
      provider: settings.defaultProvider,
    }
  }

  return null
}

// ============================================================================
// User Search
// ============================================================================

export interface SearchUsersOptions {
  excludeWorkspaceId?: string
  limit?: number
}

export async function searchUsers(
  query: string,
  options?: SearchUsersOptions
): Promise<User[]> {
  const limit = options?.limit ?? 10

  // Build the where clause
  const whereClause: Record<string, unknown> = {
    email: {
      contains: query,
    },
  }

  // If excluding workspace members, we need to filter them out
  if (options?.excludeWorkspaceId) {
    const existingMembers = await prisma.workspaceMember.findMany({
      where: { workspaceId: options.excludeWorkspaceId },
      select: { userId: true },
    })
    const excludeUserIds = existingMembers.map((m) => m.userId)

    if (excludeUserIds.length > 0) {
      whereClause.id = { notIn: excludeUserIds }
    }
  }

  return prisma.user.findMany({
    where: whereClause,
    take: limit,
    orderBy: { email: 'asc' },
    select: {
      id: true,
      email: true,
      name: true,
      avatar: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      lastLoginAt: true,
      settings: true,
      passwordHash: false,
    },
  }) as Promise<User[]>
}

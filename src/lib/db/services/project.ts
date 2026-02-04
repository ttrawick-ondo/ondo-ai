/**
 * Project Database Service
 *
 * Handles CRUD operations for projects.
 */

import { prisma } from '../index'
import type { Project, Conversation, Folder } from '@/generated/prisma'

export interface CreateProjectInput {
  workspaceId: string
  ownerId: string
  name: string
  description?: string
  color?: string
  icon?: string
  settings?: Record<string, unknown>
}

export interface UpdateProjectInput {
  name?: string
  description?: string
  color?: string
  icon?: string
  archived?: boolean
  settings?: Record<string, unknown>
}

export interface ProjectWithStats extends Project {
  conversationCount: number
  folderCount: number
}

export interface ProjectWithRelations extends Project {
  conversations: Conversation[]
  folders: Folder[]
}

// ============================================================================
// Project CRUD
// ============================================================================

export async function createProject(input: CreateProjectInput): Promise<Project> {
  return prisma.project.create({
    data: {
      workspaceId: input.workspaceId,
      ownerId: input.ownerId,
      name: input.name,
      description: input.description,
      color: input.color,
      icon: input.icon,
      settings: input.settings ? JSON.stringify(input.settings) : null,
    },
  })
}

export async function getProject(id: string): Promise<Project | null> {
  return prisma.project.findUnique({
    where: { id },
  })
}

export async function getProjectWithRelations(id: string): Promise<ProjectWithRelations | null> {
  return prisma.project.findUnique({
    where: { id },
    include: {
      conversations: {
        where: { archived: false },
        orderBy: { updatedAt: 'desc' },
      },
      folders: {
        orderBy: { position: 'asc' },
      },
    },
  })
}

export async function getProjectWithStats(id: string): Promise<ProjectWithStats | null> {
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          conversations: { where: { archived: false } },
          folders: true,
        },
      },
    },
  })

  if (!project) return null

  return {
    ...project,
    conversationCount: project._count.conversations,
    folderCount: project._count.folders,
  }
}

export async function getUserProjects(
  userId: string,
  options?: {
    workspaceId?: string
    archived?: boolean
    limit?: number
    offset?: number
  }
): Promise<ProjectWithStats[]> {
  const projects = await prisma.project.findMany({
    where: {
      ownerId: userId,
      workspaceId: options?.workspaceId,
      archived: options?.archived ?? false,
    },
    include: {
      _count: {
        select: {
          conversations: { where: { archived: false } },
          folders: true,
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
    take: options?.limit ?? 50,
    skip: options?.offset ?? 0,
  })

  return projects.map((project) => ({
    ...project,
    conversationCount: project._count.conversations,
    folderCount: project._count.folders,
  }))
}

export async function getWorkspaceProjects(
  workspaceId: string,
  options?: {
    archived?: boolean
    limit?: number
    offset?: number
  }
): Promise<ProjectWithStats[]> {
  const projects = await prisma.project.findMany({
    where: {
      workspaceId,
      archived: options?.archived ?? false,
    },
    include: {
      _count: {
        select: {
          conversations: { where: { archived: false } },
          folders: true,
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
    take: options?.limit ?? 50,
    skip: options?.offset ?? 0,
  })

  return projects.map((project) => ({
    ...project,
    conversationCount: project._count.conversations,
    folderCount: project._count.folders,
  }))
}

export async function updateProject(
  id: string,
  data: UpdateProjectInput
): Promise<Project> {
  return prisma.project.update({
    where: { id },
    data: {
      ...data,
      settings: data.settings ? JSON.stringify(data.settings) : undefined,
    },
  })
}

export async function deleteProject(id: string): Promise<void> {
  // Cascade delete is handled by Prisma schema
  await prisma.project.delete({
    where: { id },
  })
}

export async function archiveProject(id: string): Promise<Project> {
  return prisma.project.update({
    where: { id },
    data: { archived: true },
  })
}

export async function unarchiveProject(id: string): Promise<Project> {
  return prisma.project.update({
    where: { id },
    data: { archived: false },
  })
}

// ============================================================================
// Project Statistics
// ============================================================================

export async function getProjectStats(id: string): Promise<{
  conversationCount: number
  folderCount: number
  messageCount: number
  totalTokens: number
}> {
  const [conversationCount, folderCount, messageStats] = await Promise.all([
    prisma.conversation.count({
      where: { projectId: id, archived: false },
    }),
    prisma.folder.count({
      where: { projectId: id },
    }),
    prisma.message.aggregate({
      where: {
        conversation: { projectId: id },
      },
      _count: true,
      _sum: {
        inputTokens: true,
        outputTokens: true,
      },
    }),
  ])

  return {
    conversationCount,
    folderCount,
    messageCount: messageStats._count,
    totalTokens:
      (messageStats._sum.inputTokens ?? 0) + (messageStats._sum.outputTokens ?? 0),
  }
}

// ============================================================================
// Search
// ============================================================================

export async function searchProjects(
  userId: string,
  query: string,
  options?: {
    workspaceId?: string
    includeArchived?: boolean
    limit?: number
  }
): Promise<ProjectWithStats[]> {
  const projects = await prisma.project.findMany({
    where: {
      ownerId: userId,
      workspaceId: options?.workspaceId,
      archived: options?.includeArchived ? undefined : false,
      OR: [
        { name: { contains: query } },
        { description: { contains: query } },
      ],
    },
    include: {
      _count: {
        select: {
          conversations: { where: { archived: false } },
          folders: true,
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
    take: options?.limit ?? 20,
  })

  return projects.map((project) => ({
    ...project,
    conversationCount: project._count.conversations,
    folderCount: project._count.folders,
  }))
}

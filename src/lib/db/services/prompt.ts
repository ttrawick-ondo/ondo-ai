/**
 * Prompt Database Service
 *
 * Handles CRUD operations for prompt templates.
 */

import { prisma } from '../index'
import type { Prompt } from '@/generated/prisma'

export interface PromptVariable {
  name: string
  type: 'text' | 'number' | 'boolean' | 'select'
  defaultValue?: string
  description?: string
  options?: string[] // For select type
}

export interface CreatePromptInput {
  userId: string
  workspaceId?: string
  projectId?: string
  name: string
  description?: string
  content: string
  variables?: PromptVariable[]
  category?: string
  tags?: string[]
  isPublic?: boolean
}

export interface UpdatePromptInput {
  name?: string
  description?: string
  content?: string
  variables?: PromptVariable[]
  category?: string
  tags?: string[]
  isPublic?: boolean
}

// ============================================================================
// Prompts
// ============================================================================

export async function createPrompt(input: CreatePromptInput): Promise<Prompt> {
  return prisma.prompt.create({
    data: {
      userId: input.userId,
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      name: input.name,
      description: input.description,
      content: input.content,
      variables: input.variables ? JSON.stringify(input.variables) : null,
      category: input.category,
      tags: input.tags ? JSON.stringify(input.tags) : null,
      isPublic: input.isPublic ?? false,
    },
  })
}

export async function getPrompt(id: string): Promise<Prompt | null> {
  return prisma.prompt.findUnique({
    where: { id },
  })
}

export async function getUserPrompts(
  userId: string,
  options?: {
    workspaceId?: string
    projectId?: string
    category?: string
    limit?: number
    offset?: number
  }
): Promise<Prompt[]> {
  return prisma.prompt.findMany({
    where: {
      userId,
      workspaceId: options?.workspaceId,
      projectId: options?.projectId,
      category: options?.category,
    },
    orderBy: { updatedAt: 'desc' },
    take: options?.limit ?? 50,
    skip: options?.offset ?? 0,
  })
}

export async function getWorkspacePrompts(
  workspaceId: string,
  options?: {
    category?: string
    includePublic?: boolean
    limit?: number
    offset?: number
  }
): Promise<Prompt[]> {
  return prisma.prompt.findMany({
    where: {
      OR: [
        { workspaceId },
        ...(options?.includePublic ? [{ isPublic: true }] : []),
      ],
      category: options?.category,
    },
    orderBy: { updatedAt: 'desc' },
    take: options?.limit ?? 50,
    skip: options?.offset ?? 0,
  })
}

export async function getProjectPrompts(
  projectId: string,
  options?: {
    category?: string
    limit?: number
    offset?: number
  }
): Promise<Prompt[]> {
  return prisma.prompt.findMany({
    where: {
      projectId,
      category: options?.category,
    },
    orderBy: { updatedAt: 'desc' },
    take: options?.limit ?? 50,
    skip: options?.offset ?? 0,
  })
}

export async function updatePrompt(
  id: string,
  data: UpdatePromptInput
): Promise<Prompt> {
  return prisma.prompt.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description,
      content: data.content,
      variables: data.variables ? JSON.stringify(data.variables) : undefined,
      category: data.category,
      tags: data.tags ? JSON.stringify(data.tags) : undefined,
      isPublic: data.isPublic,
    },
  })
}

export async function deletePrompt(id: string): Promise<void> {
  await prisma.prompt.delete({
    where: { id },
  })
}

export async function duplicatePrompt(
  id: string,
  userId: string
): Promise<Prompt> {
  const original = await prisma.prompt.findUnique({
    where: { id },
  })

  if (!original) {
    throw new Error(`Prompt ${id} not found`)
  }

  return prisma.prompt.create({
    data: {
      userId,
      workspaceId: original.workspaceId,
      projectId: original.projectId,
      name: `${original.name} (Copy)`,
      description: original.description,
      content: original.content,
      variables: original.variables,
      category: original.category,
      tags: original.tags,
      isPublic: false, // Duplicates are private by default
    },
  })
}

export async function incrementPromptUsage(id: string): Promise<Prompt> {
  return prisma.prompt.update({
    where: { id },
    data: {
      usageCount: { increment: 1 },
    },
  })
}

// ============================================================================
// Search
// ============================================================================

export async function searchPrompts(
  query: string,
  options?: {
    userId?: string
    workspaceId?: string
    category?: string
    includePublic?: boolean
    limit?: number
  }
): Promise<Prompt[]> {
  return prisma.prompt.findMany({
    where: {
      OR: [
        { name: { contains: query } },
        { description: { contains: query } },
        { tags: { contains: query } },
      ],
      AND: [
        {
          OR: [
            ...(options?.userId ? [{ userId: options.userId }] : []),
            ...(options?.workspaceId ? [{ workspaceId: options.workspaceId }] : []),
            ...(options?.includePublic ? [{ isPublic: true }] : []),
          ],
        },
        ...(options?.category ? [{ category: options.category }] : []),
      ],
    },
    orderBy: { usageCount: 'desc' },
    take: options?.limit ?? 20,
  })
}

// ============================================================================
// Categories
// ============================================================================

export async function getPromptCategories(
  workspaceId?: string
): Promise<Array<{ category: string; count: number }>> {
  const prompts = await prisma.prompt.groupBy({
    by: ['category'],
    where: {
      category: { not: null },
      ...(workspaceId && { workspaceId }),
    },
    _count: true,
  })

  return prompts
    .filter((p) => p.category)
    .map((p) => ({
      category: p.category!,
      count: p._count,
    }))
}

// ============================================================================
// Helpers
// ============================================================================

export function parsePromptVariables(prompt: Prompt): PromptVariable[] {
  if (!prompt.variables) return []
  try {
    return JSON.parse(prompt.variables) as PromptVariable[]
  } catch {
    return []
  }
}

export function parsePromptTags(prompt: Prompt): string[] {
  if (!prompt.tags) return []
  try {
    return JSON.parse(prompt.tags) as string[]
  } catch {
    return []
  }
}

/**
 * Folder Database Service
 *
 * Handles CRUD operations for folders with nested hierarchy support.
 */

import { prisma } from '../index'
import type { Folder, Conversation } from '@/generated/prisma'

export interface CreateFolderInput {
  projectId: string
  parentId?: string | null
  name: string
  color?: string | null
  icon?: string | null
  position?: number
}

export interface UpdateFolderInput {
  name?: string
  color?: string | null
  icon?: string | null
  position?: number
  parentId?: string | null
}

export interface FolderWithChildren extends Folder {
  children: FolderWithChildren[]
  conversations: Conversation[]
}

export interface FolderTreeNode {
  id: string
  name: string
  color: string | null
  icon: string | null
  position: number
  depth: number
  parentId: string | null
  projectId: string
  children: FolderTreeNode[]
  conversationIds: string[]
}

// ============================================================================
// Folder CRUD
// ============================================================================

export async function createFolder(input: CreateFolderInput): Promise<Folder> {
  // Calculate depth based on parent
  let depth = 0
  if (input.parentId) {
    const parent = await prisma.folder.findUnique({
      where: { id: input.parentId },
    })
    if (parent) {
      depth = parent.depth + 1
    }
  }

  // Get next position if not provided
  let position = input.position ?? 0
  if (input.position === undefined) {
    const lastFolder = await prisma.folder.findFirst({
      where: {
        projectId: input.projectId,
        parentId: input.parentId ?? null,
      },
      orderBy: { position: 'desc' },
    })
    position = lastFolder ? lastFolder.position + 1 : 0
  }

  return prisma.folder.create({
    data: {
      projectId: input.projectId,
      parentId: input.parentId ?? null,
      name: input.name,
      color: input.color,
      icon: input.icon,
      position,
      depth,
    },
  })
}

export async function getFolder(id: string): Promise<Folder | null> {
  return prisma.folder.findUnique({
    where: { id },
  })
}

export async function getFolderWithChildren(id: string): Promise<FolderWithChildren | null> {
  const folder = await prisma.folder.findUnique({
    where: { id },
    include: {
      children: {
        orderBy: { position: 'asc' },
      },
      conversations: {
        orderBy: { updatedAt: 'desc' },
      },
    },
  })

  if (!folder) return null

  // Recursively fetch children
  const childrenWithNested = await Promise.all(
    folder.children.map((child) => getFolderWithChildren(child.id))
  )

  return {
    ...folder,
    children: childrenWithNested.filter((c): c is FolderWithChildren => c !== null),
  }
}

export async function getProjectFolders(
  projectId: string,
  options?: {
    parentId?: string | null
    includeChildren?: boolean
  }
): Promise<Folder[]> {
  return prisma.folder.findMany({
    where: {
      projectId,
      parentId: options?.parentId !== undefined ? options.parentId : undefined,
    },
    orderBy: { position: 'asc' },
    include: options?.includeChildren
      ? {
          children: {
            orderBy: { position: 'asc' },
          },
        }
      : undefined,
  })
}

export async function getRootFolders(projectId: string): Promise<Folder[]> {
  return prisma.folder.findMany({
    where: {
      projectId,
      parentId: null,
    },
    orderBy: { position: 'asc' },
  })
}

export async function updateFolder(id: string, data: UpdateFolderInput): Promise<Folder> {
  // If moving to a different parent, recalculate depth
  let updateData: Record<string, unknown> = { ...data }

  if (data.parentId !== undefined) {
    let newDepth = 0
    if (data.parentId) {
      const newParent = await prisma.folder.findUnique({
        where: { id: data.parentId },
      })
      if (newParent) {
        newDepth = newParent.depth + 1
      }
    }
    updateData = { ...updateData, depth: newDepth }

    // Update depths of all descendants recursively
    await updateDescendantDepths(id, newDepth)
  }

  return prisma.folder.update({
    where: { id },
    data: updateData,
  })
}

async function updateDescendantDepths(folderId: string, parentDepth: number): Promise<void> {
  const children = await prisma.folder.findMany({
    where: { parentId: folderId },
  })

  for (const child of children) {
    const newDepth = parentDepth + 1
    await prisma.folder.update({
      where: { id: child.id },
      data: { depth: newDepth },
    })
    await updateDescendantDepths(child.id, newDepth)
  }
}

export async function deleteFolder(id: string): Promise<void> {
  // Cascade delete is handled by Prisma schema
  await prisma.folder.delete({
    where: { id },
  })
}

// ============================================================================
// Folder Tree Operations
// ============================================================================

export async function getFolderTree(projectId: string): Promise<FolderTreeNode[]> {
  // Get all folders for the project
  const folders = await prisma.folder.findMany({
    where: { projectId },
    orderBy: { position: 'asc' },
  })

  // Get all conversations in folders for this project
  const conversations = await prisma.conversation.findMany({
    where: {
      projectId,
      folderId: { not: null },
    },
    select: { id: true, folderId: true },
  })

  // Build folder-to-conversations map
  const folderConversations = new Map<string, string[]>()
  for (const conv of conversations) {
    if (conv.folderId) {
      const existing = folderConversations.get(conv.folderId) || []
      folderConversations.set(conv.folderId, [...existing, conv.id])
    }
  }

  // Build tree structure
  const folderMap = new Map<string, FolderTreeNode>()

  // First pass: create all nodes
  for (const folder of folders) {
    folderMap.set(folder.id, {
      id: folder.id,
      name: folder.name,
      color: folder.color,
      icon: folder.icon,
      position: folder.position,
      depth: folder.depth,
      parentId: folder.parentId,
      projectId: folder.projectId,
      children: [],
      conversationIds: folderConversations.get(folder.id) || [],
    })
  }

  // Second pass: build hierarchy
  const rootFolders: FolderTreeNode[] = []
  for (const folder of folders) {
    const node = folderMap.get(folder.id)!
    if (folder.parentId && folderMap.has(folder.parentId)) {
      folderMap.get(folder.parentId)!.children.push(node)
    } else {
      rootFolders.push(node)
    }
  }

  return rootFolders
}

export async function moveFolder(
  folderId: string,
  targetParentId: string | null,
  targetPosition?: number
): Promise<Folder> {
  const folder = await getFolder(folderId)
  if (!folder) {
    throw new Error(`Folder ${folderId} not found`)
  }

  // Prevent moving folder into itself or its descendants
  if (targetParentId) {
    const descendants = await getAllDescendantIds(folderId)
    if (descendants.includes(targetParentId)) {
      throw new Error('Cannot move folder into its own descendant')
    }
  }

  // Get new position
  let position = targetPosition ?? 0
  if (targetPosition === undefined) {
    const lastFolder = await prisma.folder.findFirst({
      where: {
        projectId: folder.projectId,
        parentId: targetParentId,
      },
      orderBy: { position: 'desc' },
    })
    position = lastFolder ? lastFolder.position + 1 : 0
  }

  return updateFolder(folderId, {
    parentId: targetParentId,
    position,
  })
}

async function getAllDescendantIds(folderId: string): Promise<string[]> {
  const children = await prisma.folder.findMany({
    where: { parentId: folderId },
    select: { id: true },
  })

  const descendantIds: string[] = children.map((c) => c.id)
  for (const child of children) {
    const childDescendants = await getAllDescendantIds(child.id)
    descendantIds.push(...childDescendants)
  }

  return descendantIds
}

// ============================================================================
// Conversation Folder Operations
// ============================================================================

export async function moveConversationToFolder(
  conversationId: string,
  folderId: string | null
): Promise<Conversation> {
  // If moving to a folder, verify the folder exists and get its project
  if (folderId) {
    const folder = await prisma.folder.findUnique({
      where: { id: folderId },
    })
    if (!folder) {
      throw new Error(`Folder ${folderId} not found`)
    }

    // Update conversation with both folder and project
    return prisma.conversation.update({
      where: { id: conversationId },
      data: {
        folderId,
        projectId: folder.projectId,
      },
    })
  }

  // Moving out of folder (just remove folderId)
  return prisma.conversation.update({
    where: { id: conversationId },
    data: {
      folderId: null,
    },
  })
}

export async function getConversationsInFolder(
  folderId: string,
  options?: {
    limit?: number
    offset?: number
    archived?: boolean
  }
): Promise<Conversation[]> {
  return prisma.conversation.findMany({
    where: {
      folderId,
      archived: options?.archived ?? false,
    },
    orderBy: { updatedAt: 'desc' },
    take: options?.limit ?? 50,
    skip: options?.offset ?? 0,
  })
}

export async function getUnorganizedConversations(
  projectId: string,
  options?: {
    limit?: number
    offset?: number
    archived?: boolean
  }
): Promise<Conversation[]> {
  return prisma.conversation.findMany({
    where: {
      projectId,
      folderId: null,
      archived: options?.archived ?? false,
    },
    orderBy: { updatedAt: 'desc' },
    take: options?.limit ?? 50,
    skip: options?.offset ?? 0,
  })
}

// ============================================================================
// Folder Statistics
// ============================================================================

export async function getFolderStats(folderId: string): Promise<{
  conversationCount: number
  childFolderCount: number
  totalNestedConversations: number
}> {
  const [conversationCount, childFolderCount] = await Promise.all([
    prisma.conversation.count({ where: { folderId } }),
    prisma.folder.count({ where: { parentId: folderId } }),
  ])

  // Count nested conversations recursively
  const descendantIds = await getAllDescendantIds(folderId)
  const nestedConversationCount = await prisma.conversation.count({
    where: {
      folderId: { in: descendantIds },
    },
  })

  return {
    conversationCount,
    childFolderCount,
    totalNestedConversations: conversationCount + nestedConversationCount,
  }
}

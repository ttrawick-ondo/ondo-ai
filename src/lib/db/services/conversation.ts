/**
 * Conversation Database Service
 *
 * Handles CRUD operations for conversations and messages.
 */

import { prisma } from '../index'
import type { Conversation, Message } from '@/generated/prisma'

export interface CreateConversationInput {
  userId: string
  projectId?: string
  folderId?: string | null
  workspaceId?: string | null // null = Personal space
  title: string
  model: string
  provider: string
  systemPrompt?: string
  metadata?: Record<string, unknown>
  // Branching support
  parentId?: string | null
  branchPointId?: string | null
}

export interface CreateMessageInput {
  conversationId: string
  userId?: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  model?: string
  provider?: string
  inputTokens?: number
  outputTokens?: number
  estimatedCost?: number
  toolCalls?: Record<string, unknown>[]
  toolCallId?: string
  attachments?: Record<string, unknown>[]
  metadata?: Record<string, unknown>
}

export interface ConversationWithMessages extends Conversation {
  messages: Message[]
}

// ============================================================================
// Conversations
// ============================================================================

export async function createConversation(
  input: CreateConversationInput
): Promise<Conversation> {
  return prisma.conversation.create({
    data: {
      userId: input.userId,
      projectId: input.projectId,
      folderId: input.folderId ?? null,
      workspaceId: input.workspaceId ?? null,
      title: input.title,
      model: input.model,
      provider: input.provider,
      systemPrompt: input.systemPrompt,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      parentId: input.parentId ?? null,
      branchPointId: input.branchPointId ?? null,
    },
  })
}

export async function getConversation(id: string): Promise<Conversation | null> {
  return prisma.conversation.findUnique({
    where: { id },
  })
}

export async function getConversationWithMessages(
  id: string
): Promise<ConversationWithMessages | null> {
  return prisma.conversation.findUnique({
    where: { id },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
    },
  })
}

export async function getUserConversations(
  userId: string,
  workspaceId: string | null,
  options?: {
    projectId?: string
    limit?: number
    offset?: number
    archived?: boolean
  }
): Promise<Conversation[]> {
  return prisma.conversation.findMany({
    where: {
      userId,
      workspaceId: workspaceId, // null = Personal space
      projectId: options?.projectId,
      archived: options?.archived ?? false,
    },
    orderBy: { updatedAt: 'desc' },
    take: options?.limit ?? 50,
    skip: options?.offset ?? 0,
  })
}

export async function updateConversation(
  id: string,
  data: Partial<{
    title: string
    model: string
    provider: string
    systemPrompt: string
    archived: boolean
    pinned: boolean
    projectId: string | null
    folderId: string | null
    workspaceId: string | null
    metadata: Record<string, unknown>
  }>
): Promise<Conversation> {
  return prisma.conversation.update({
    where: { id },
    data: {
      ...data,
      metadata: data.metadata ? JSON.stringify(data.metadata) : undefined,
    },
  })
}

export async function deleteConversation(id: string): Promise<void> {
  await prisma.conversation.delete({
    where: { id },
  })
}

export async function archiveConversation(id: string): Promise<Conversation> {
  return prisma.conversation.update({
    where: { id },
    data: { archived: true },
  })
}

// ============================================================================
// Messages
// ============================================================================

export async function createMessage(input: CreateMessageInput): Promise<Message> {
  // Update conversation's updatedAt timestamp
  await prisma.conversation.update({
    where: { id: input.conversationId },
    data: { updatedAt: new Date() },
  })

  return prisma.message.create({
    data: {
      conversationId: input.conversationId,
      userId: input.userId,
      role: input.role,
      content: input.content,
      model: input.model,
      provider: input.provider,
      inputTokens: input.inputTokens,
      outputTokens: input.outputTokens,
      estimatedCost: input.estimatedCost,
      toolCalls: input.toolCalls ? JSON.stringify(input.toolCalls) : null,
      toolCallId: input.toolCallId,
      attachments: input.attachments ? JSON.stringify(input.attachments) : null,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    },
  })
}

/**
 * Parse JSON fields in a message that are stored as strings
 */
function parseMessageJsonFields(message: Message): Message & {
  metadata: Record<string, unknown> | null
  toolCalls: Record<string, unknown>[] | null
  attachments: Record<string, unknown>[] | null
} {
  return {
    ...message,
    metadata: message.metadata ? JSON.parse(message.metadata) : null,
    toolCalls: message.toolCalls ? JSON.parse(message.toolCalls) : null,
    attachments: message.attachments ? JSON.parse(message.attachments) : null,
  }
}

export async function getMessages(
  conversationId: string,
  options?: {
    limit?: number
    offset?: number
    before?: Date
    after?: Date
  }
): Promise<(Message & { metadata: Record<string, unknown> | null })[]> {
  const messages = await prisma.message.findMany({
    where: {
      conversationId,
      createdAt: {
        lt: options?.before,
        gt: options?.after,
      },
    },
    orderBy: { createdAt: 'asc' },
    take: options?.limit,
    skip: options?.offset,
  })

  // Parse JSON fields before returning
  return messages.map(parseMessageJsonFields)
}

export async function getMessage(id: string): Promise<(Message & { metadata: Record<string, unknown> | null }) | null> {
  const message = await prisma.message.findUnique({
    where: { id },
  })

  if (!message) return null

  return parseMessageJsonFields(message)
}

export async function deleteMessage(id: string): Promise<void> {
  await prisma.message.delete({
    where: { id },
  })
}

// ============================================================================
// Statistics
// ============================================================================

export async function getConversationStats(
  userId: string,
  workspaceId?: string | null
): Promise<{
  totalConversations: number
  totalMessages: number
  totalTokens: number
  estimatedCost: number
}> {
  const where = workspaceId !== undefined
    ? { userId, workspaceId }
    : { userId }

  const [conversationCount, messageStats] = await Promise.all([
    prisma.conversation.count({
      where,
    }),
    prisma.message.aggregate({
      where: {
        conversation: where,
      },
      _count: true,
      _sum: {
        inputTokens: true,
        outputTokens: true,
        estimatedCost: true,
      },
    }),
  ])

  return {
    totalConversations: conversationCount,
    totalMessages: messageStats._count,
    totalTokens:
      (messageStats._sum.inputTokens ?? 0) + (messageStats._sum.outputTokens ?? 0),
    estimatedCost: messageStats._sum.estimatedCost ?? 0,
  }
}

// ============================================================================
// Branching
// ============================================================================

export interface BranchConversationInput {
  userId: string
  sourceConversationId: string
  branchPointMessageId: string
  title?: string
}

export interface ConversationWithBranches extends Conversation {
  branches: Conversation[]
  parent: Conversation | null
}

export async function branchConversation(
  input: BranchConversationInput
): Promise<Conversation> {
  // Get the source conversation
  const source = await prisma.conversation.findUnique({
    where: { id: input.sourceConversationId },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  })

  if (!source) {
    throw new Error(`Source conversation ${input.sourceConversationId} not found`)
  }

  // Find the branch point message
  const branchPointIndex = source.messages.findIndex(
    (m) => m.id === input.branchPointMessageId
  )
  if (branchPointIndex === -1) {
    throw new Error(`Branch point message ${input.branchPointMessageId} not found`)
  }

  // Get messages up to and including the branch point
  const messagesToCopy = source.messages.slice(0, branchPointIndex + 1)

  // Create the new conversation
  const branchTitle = input.title || `Branch of ${source.title}`
  const newConversation = await prisma.conversation.create({
    data: {
      userId: input.userId,
      projectId: source.projectId,
      folderId: source.folderId,
      workspaceId: source.workspaceId, // Inherit workspace from source
      title: branchTitle,
      model: source.model,
      provider: source.provider,
      systemPrompt: source.systemPrompt,
      metadata: source.metadata,
      parentId: source.id,
      branchPointId: input.branchPointMessageId,
    },
  })

  // Copy messages to the new conversation
  for (const msg of messagesToCopy) {
    await prisma.message.create({
      data: {
        conversationId: newConversation.id,
        userId: msg.userId,
        role: msg.role,
        content: msg.content,
        model: msg.model,
        provider: msg.provider,
        inputTokens: msg.inputTokens,
        outputTokens: msg.outputTokens,
        estimatedCost: msg.estimatedCost,
        toolCalls: msg.toolCalls,
        toolCallId: msg.toolCallId,
        attachments: msg.attachments,
        metadata: msg.metadata,
      },
    })
  }

  return newConversation
}

export async function getConversationBranches(
  conversationId: string
): Promise<Conversation[]> {
  return prisma.conversation.findMany({
    where: { parentId: conversationId },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getConversationWithBranches(
  id: string
): Promise<ConversationWithBranches | null> {
  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      branches: {
        orderBy: { createdAt: 'desc' },
      },
      parent: true,
    },
  })

  return conversation
}

// ============================================================================
// Pinned Conversations
// ============================================================================

export async function getPinnedConversations(
  userId: string,
  workspaceId: string | null,
  options?: {
    projectId?: string
    limit?: number
  }
): Promise<Conversation[]> {
  return prisma.conversation.findMany({
    where: {
      userId,
      workspaceId: workspaceId, // null = Personal space
      pinned: true,
      projectId: options?.projectId,
      archived: false,
    },
    orderBy: { updatedAt: 'desc' },
    take: options?.limit ?? 20,
  })
}

export async function toggleConversationPin(
  id: string
): Promise<Conversation> {
  const conversation = await prisma.conversation.findUnique({
    where: { id },
  })
  if (!conversation) {
    throw new Error(`Conversation ${id} not found`)
  }

  return prisma.conversation.update({
    where: { id },
    data: { pinned: !conversation.pinned },
  })
}

// ============================================================================
// Search
// ============================================================================

export async function searchConversations(
  userId: string,
  workspaceId: string | null,
  query: string,
  options?: {
    projectId?: string
    folderId?: string
    limit?: number
    includeArchived?: boolean
  }
): Promise<Conversation[]> {
  // SQLite uses LIKE for searching
  return prisma.conversation.findMany({
    where: {
      userId,
      workspaceId: workspaceId, // null = Personal space
      projectId: options?.projectId,
      folderId: options?.folderId,
      archived: options?.includeArchived ? undefined : false,
      OR: [
        { title: { contains: query } },
        // Search in messages content
        {
          messages: {
            some: {
              content: { contains: query },
            },
          },
        },
      ],
    },
    orderBy: { updatedAt: 'desc' },
    take: options?.limit ?? 20,
  })
}

// ============================================================================
// Recent Conversations (without project/folder)
// ============================================================================

export async function getRecentConversations(
  userId: string,
  workspaceId: string | null,
  options?: {
    limit?: number
    excludeProjected?: boolean
  }
): Promise<Conversation[]> {
  return prisma.conversation.findMany({
    where: {
      userId,
      workspaceId: workspaceId, // null = Personal space
      archived: false,
      ...(options?.excludeProjected && {
        projectId: null,
        folderId: null,
      }),
    },
    orderBy: { updatedAt: 'desc' },
    take: options?.limit ?? 10,
  })
}

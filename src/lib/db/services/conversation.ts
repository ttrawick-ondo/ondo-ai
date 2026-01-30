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
  title: string
  model: string
  provider: string
  systemPrompt?: string
  metadata?: Record<string, unknown>
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
      title: input.title,
      model: input.model,
      provider: input.provider,
      systemPrompt: input.systemPrompt,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
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

export async function getMessages(
  conversationId: string,
  options?: {
    limit?: number
    offset?: number
    before?: Date
    after?: Date
  }
): Promise<Message[]> {
  return prisma.message.findMany({
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
}

export async function getMessage(id: string): Promise<Message | null> {
  return prisma.message.findUnique({
    where: { id },
  })
}

export async function deleteMessage(id: string): Promise<void> {
  await prisma.message.delete({
    where: { id },
  })
}

// ============================================================================
// Statistics
// ============================================================================

export async function getConversationStats(userId: string): Promise<{
  totalConversations: number
  totalMessages: number
  totalTokens: number
  estimatedCost: number
}> {
  const [conversationCount, messageStats] = await Promise.all([
    prisma.conversation.count({
      where: { userId },
    }),
    prisma.message.aggregate({
      where: {
        conversation: { userId },
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

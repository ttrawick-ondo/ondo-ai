/**
 * Conversation API Client
 * Handles all conversation-related API calls
 */

import type { Conversation, Message } from '@/types'

const API_BASE = '/api/conversations'

// API response type from the database (uses 'model' instead of 'modelId')
interface ConversationApiResponse {
  id: string
  title: string
  projectId?: string | null
  folderId?: string | null
  userId: string
  model: string
  provider: string
  systemPrompt?: string | null
  archived?: boolean
  pinned?: boolean
  parentId?: string | null
  branchPointId?: string | null
  createdAt: string
  updatedAt: string
}

// Map API response to frontend Conversation type
function mapApiResponse(data: ConversationApiResponse): Conversation {
  return {
    id: data.id,
    title: data.title,
    projectId: data.projectId || null,
    folderId: data.folderId || null,
    userId: data.userId,
    modelId: data.model, // Map model -> modelId
    messageCount: 0, // Will be updated separately if needed
    lastMessageAt: new Date(data.updatedAt),
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt),
    pinned: data.pinned || false,
    archived: data.archived || false,
    parentId: data.parentId || null,
    branchPointId: data.branchPointId || null,
  }
}

export interface CreateConversationInput {
  userId: string
  projectId?: string
  folderId?: string | null
  title: string
  model: string
  provider: string
  systemPrompt?: string
  metadata?: Record<string, unknown>
}

export interface UpdateConversationInput {
  title?: string
  model?: string
  provider?: string
  systemPrompt?: string
  archived?: boolean
  pinned?: boolean
  projectId?: string | null
  folderId?: string | null
  metadata?: Record<string, unknown>
}

export interface CreateMessageInput {
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

export interface ConversationWithBranches extends Conversation {
  branches: Conversation[]
  parent: Conversation | null
}

class ConversationApiClient {
  /**
   * Get all conversations for a user
   */
  async getUserConversations(
    userId: string,
    options?: {
      projectId?: string
      archived?: boolean
      limit?: number
      offset?: number
    }
  ): Promise<Conversation[]> {
    const params = new URLSearchParams({ userId })
    if (options?.projectId) params.set('projectId', options.projectId)
    if (options?.archived) params.set('archived', 'true')
    if (options?.limit) params.set('limit', options.limit.toString())
    if (options?.offset) params.set('offset', options.offset.toString())

    const response = await fetch(`${API_BASE}?${params}`)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to fetch conversations')
    }

    const { data } = await response.json()
    return (data as ConversationApiResponse[]).map(mapApiResponse)
  }

  /**
   * Get pinned conversations for a user
   */
  async getPinnedConversations(
    userId: string,
    options?: {
      projectId?: string
      limit?: number
    }
  ): Promise<Conversation[]> {
    const params = new URLSearchParams({ userId, pinned: 'true' })
    if (options?.projectId) params.set('projectId', options.projectId)
    if (options?.limit) params.set('limit', options.limit.toString())

    const response = await fetch(`${API_BASE}?${params}`)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to fetch pinned conversations')
    }

    const { data } = await response.json()
    return (data as ConversationApiResponse[]).map(mapApiResponse)
  }

  /**
   * Get recent conversations without a project
   */
  async getRecentConversations(
    userId: string,
    options?: {
      limit?: number
    }
  ): Promise<Conversation[]> {
    const params = new URLSearchParams({ userId, recent: 'true' })
    if (options?.limit) params.set('limit', options.limit.toString())

    const response = await fetch(`${API_BASE}?${params}`)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to fetch recent conversations')
    }

    const { data } = await response.json()
    return (data as ConversationApiResponse[]).map(mapApiResponse)
  }

  /**
   * Search conversations
   */
  async searchConversations(
    userId: string,
    query: string,
    options?: {
      projectId?: string
      folderId?: string
      includeArchived?: boolean
      limit?: number
    }
  ): Promise<Conversation[]> {
    const params = new URLSearchParams({ userId, search: query })
    if (options?.projectId) params.set('projectId', options.projectId)
    if (options?.folderId) params.set('folderId', options.folderId)
    if (options?.includeArchived) params.set('archived', 'true')
    if (options?.limit) params.set('limit', options.limit.toString())

    const response = await fetch(`${API_BASE}?${params}`)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to search conversations')
    }

    const { data } = await response.json()
    return (data as ConversationApiResponse[]).map(mapApiResponse)
  }

  /**
   * Get a single conversation
   */
  async getConversation(
    conversationId: string,
    options?: {
      includeMessages?: boolean
      includeBranches?: boolean
    }
  ): Promise<Conversation | ConversationWithMessages | ConversationWithBranches> {
    const params = new URLSearchParams()
    if (options?.includeMessages) params.set('messages', 'true')
    if (options?.includeBranches) params.set('branches', 'true')

    const url = params.toString()
      ? `${API_BASE}/${conversationId}?${params}`
      : `${API_BASE}/${conversationId}`

    const response = await fetch(url)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to fetch conversation')
    }

    const { data } = await response.json()
    return mapApiResponse(data as ConversationApiResponse)
  }

  /**
   * Create a new conversation
   */
  async createConversation(input: CreateConversationInput): Promise<Conversation> {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create conversation')
    }

    const { data } = await response.json()
    return mapApiResponse(data as ConversationApiResponse)
  }

  /**
   * Update a conversation
   */
  async updateConversation(
    conversationId: string,
    input: UpdateConversationInput
  ): Promise<Conversation> {
    const response = await fetch(`${API_BASE}/${conversationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update conversation')
    }

    const { data } = await response.json()
    return mapApiResponse(data as ConversationApiResponse)
  }

  /**
   * Archive a conversation
   */
  async archiveConversation(conversationId: string): Promise<Conversation> {
    const response = await fetch(`${API_BASE}/${conversationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archive: true }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to archive conversation')
    }

    const { data } = await response.json()
    return mapApiResponse(data as ConversationApiResponse)
  }

  /**
   * Toggle pinned status
   */
  async togglePin(conversationId: string): Promise<Conversation> {
    const response = await fetch(`${API_BASE}/${conversationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ togglePin: true }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to toggle pin')
    }

    const { data } = await response.json()
    return mapApiResponse(data as ConversationApiResponse)
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(conversationId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/${conversationId}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to delete conversation')
    }
  }

  /**
   * Branch a conversation from a specific message
   */
  async branchConversation(
    conversationId: string,
    branchPointMessageId: string,
    title?: string
  ): Promise<Conversation> {
    const response = await fetch(`${API_BASE}/${conversationId}/branch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ branchPointMessageId, title }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to branch conversation')
    }

    const { data } = await response.json()
    return mapApiResponse(data as ConversationApiResponse)
  }

  // ============================================================================
  // Messages
  // ============================================================================

  /**
   * Get messages for a conversation
   */
  async getMessages(
    conversationId: string,
    options?: {
      limit?: number
      offset?: number
      before?: Date
      after?: Date
    }
  ): Promise<Message[]> {
    const params = new URLSearchParams()
    if (options?.limit) params.set('limit', options.limit.toString())
    if (options?.offset) params.set('offset', options.offset.toString())
    if (options?.before) params.set('before', options.before.toISOString())
    if (options?.after) params.set('after', options.after.toISOString())

    const url = params.toString()
      ? `${API_BASE}/${conversationId}/messages?${params}`
      : `${API_BASE}/${conversationId}/messages`

    const response = await fetch(url)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to fetch messages')
    }

    const { data } = await response.json()
    return data
  }

  /**
   * Create a message
   */
  async createMessage(
    conversationId: string,
    input: CreateMessageInput
  ): Promise<Message> {
    const response = await fetch(`${API_BASE}/${conversationId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create message')
    }

    const { data } = await response.json()
    return data
  }
}

export const conversationApi = new ConversationApiClient()

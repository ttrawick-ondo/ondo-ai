/**
 * Prompt API Client
 * Handles all prompt-related API calls
 */

import type { Prompt, PromptVariable, PromptCategory } from '@/types'

const API_BASE = '/api/prompts'

// API response type from the database
interface PromptApiResponse {
  id: string
  userId: string
  workspaceId?: string | null
  projectId?: string | null
  name: string
  description?: string | null
  content: string
  variables?: string | null
  category?: string | null
  tags?: string | null
  isPublic: boolean
  usageCount: number
  createdAt: string
  updatedAt: string
}

// Map API response to frontend Prompt type
function mapPromptResponse(data: PromptApiResponse): Prompt {
  let variables: PromptVariable[] = []
  let tags: string[] = []

  try {
    if (data.variables) variables = JSON.parse(data.variables)
  } catch {
    // Ignore parse errors
  }

  try {
    if (data.tags) tags = JSON.parse(data.tags)
  } catch {
    // Ignore parse errors
  }

  return {
    id: data.id,
    title: data.name,
    description: data.description || undefined,
    content: data.content,
    variables,
    categoryId: data.category || undefined,
    tags,
    visibility: data.isPublic ? 'public' : 'private',
    workspaceId: data.workspaceId || undefined,
    userId: data.userId,
    usageCount: data.usageCount,
    isFavorite: false, // Not stored in DB, managed client-side
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt),
  }
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

class PromptApiClient {
  /**
   * Get prompts for a user
   */
  async getUserPrompts(
    userId: string,
    options?: {
      workspaceId?: string
      category?: string
      limit?: number
      offset?: number
    }
  ): Promise<Prompt[]> {
    const params = new URLSearchParams({ userId })
    if (options?.workspaceId) params.set('workspaceId', options.workspaceId)
    if (options?.category) params.set('category', options.category)
    if (options?.limit) params.set('limit', options.limit.toString())
    if (options?.offset) params.set('offset', options.offset.toString())

    const response = await fetch(`${API_BASE}?${params}`)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to fetch prompts')
    }

    const { data } = await response.json()
    return (data as PromptApiResponse[]).map(mapPromptResponse)
  }

  /**
   * Get prompts for a workspace
   */
  async getWorkspacePrompts(
    workspaceId: string,
    options?: {
      category?: string
      includePublic?: boolean
      limit?: number
      offset?: number
    }
  ): Promise<Prompt[]> {
    const params = new URLSearchParams({ workspaceId })
    if (options?.category) params.set('category', options.category)
    if (options?.includePublic) params.set('includePublic', 'true')
    if (options?.limit) params.set('limit', options.limit.toString())
    if (options?.offset) params.set('offset', options.offset.toString())

    const response = await fetch(`${API_BASE}?${params}`)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to fetch prompts')
    }

    const { data } = await response.json()
    return (data as PromptApiResponse[]).map(mapPromptResponse)
  }

  /**
   * Search prompts
   */
  async searchPrompts(
    query: string,
    options?: {
      userId?: string
      workspaceId?: string
      category?: string
      includePublic?: boolean
      limit?: number
    }
  ): Promise<Prompt[]> {
    const params = new URLSearchParams({ search: query })
    if (options?.userId) params.set('userId', options.userId)
    if (options?.workspaceId) params.set('workspaceId', options.workspaceId)
    if (options?.category) params.set('category', options.category)
    if (options?.includePublic) params.set('includePublic', 'true')
    if (options?.limit) params.set('limit', options.limit.toString())

    const response = await fetch(`${API_BASE}?${params}`)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to search prompts')
    }

    const { data } = await response.json()
    return (data as PromptApiResponse[]).map(mapPromptResponse)
  }

  /**
   * Get prompt categories
   */
  async getCategories(workspaceId?: string): Promise<PromptCategory[]> {
    const params = new URLSearchParams({ categories: 'true' })
    if (workspaceId) params.set('workspaceId', workspaceId)

    const response = await fetch(`${API_BASE}?${params}`)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to fetch categories')
    }

    const { data } = await response.json()
    return (data as Array<{ category: string; count: number }>).map((c, i) => ({
      id: c.category,
      name: c.category,
      color: undefined,
      icon: undefined,
      promptCount: c.count,
    }))
  }

  /**
   * Get a single prompt
   */
  async getPrompt(promptId: string): Promise<Prompt> {
    const response = await fetch(`${API_BASE}/${promptId}`)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to fetch prompt')
    }

    const { data } = await response.json()
    return mapPromptResponse(data as PromptApiResponse)
  }

  /**
   * Create a new prompt
   */
  async createPrompt(input: CreatePromptInput): Promise<Prompt> {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create prompt')
    }

    const { data } = await response.json()
    return mapPromptResponse(data as PromptApiResponse)
  }

  /**
   * Update a prompt
   */
  async updatePrompt(
    promptId: string,
    input: UpdatePromptInput
  ): Promise<Prompt> {
    const response = await fetch(`${API_BASE}/${promptId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update prompt')
    }

    const { data } = await response.json()
    return mapPromptResponse(data as PromptApiResponse)
  }

  /**
   * Delete a prompt
   */
  async deletePrompt(promptId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/${promptId}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to delete prompt')
    }
  }

  /**
   * Duplicate a prompt
   */
  async duplicatePrompt(promptId: string, userId: string): Promise<Prompt> {
    const response = await fetch(`${API_BASE}/${promptId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to duplicate prompt')
    }

    const { data } = await response.json()
    return mapPromptResponse(data as PromptApiResponse)
  }

  /**
   * Increment usage count
   */
  async incrementUsage(promptId: string): Promise<Prompt> {
    const response = await fetch(`${API_BASE}/${promptId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ incrementUsage: true }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to increment usage')
    }

    const { data } = await response.json()
    return mapPromptResponse(data as PromptApiResponse)
  }
}

export const promptApi = new PromptApiClient()

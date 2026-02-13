/**
 * Project API Client
 * Handles all project-related API calls
 */

import type { Project } from '@/types'
import { PROJECT_COLORS } from '@/types'

const API_BASE = '/api/projects'

export interface ProjectWithStats extends Project {
  conversationCount: number
  folderCount: number
}

// API response type from the database (uses 'ownerId' instead of 'userId')
interface ProjectApiResponse {
  id: string
  workspaceId: string | null // null = Personal space
  ownerId: string
  name: string
  description?: string | null
  color?: string | null
  icon?: string | null
  archived?: boolean
  createdAt: string
  updatedAt: string
  conversationCount?: number
  folderCount?: number
}

// Map API response to frontend Project type
function mapApiResponse(data: ProjectApiResponse): ProjectWithStats {
  return {
    id: data.id,
    name: data.name,
    description: data.description || undefined,
    color: data.color || PROJECT_COLORS[0],
    icon: data.icon || undefined,
    workspaceId: data.workspaceId ?? undefined, // null -> undefined for frontend
    userId: data.ownerId, // Map ownerId -> userId
    conversationCount: data.conversationCount || 0,
    folderCount: data.folderCount || 0,
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt),
  }
}

export interface CreateProjectInput {
  workspaceId?: string | null // null = Personal space
  ownerId: string
  name: string
  description?: string
  color?: string
  icon?: string
}

export interface UpdateProjectInput {
  name?: string
  description?: string
  color?: string
  icon?: string
  archived?: boolean
}

class ProjectApiClient {
  /**
   * Get ALL projects for a user (no workspace filter)
   * Used for initial load - selector filters by workspace
   */
  async getAllUserProjects(
    userId: string,
    options?: {
      archived?: boolean
      limit?: number
      offset?: number
    }
  ): Promise<ProjectWithStats[]> {
    const params = new URLSearchParams({ userId })
    // Don't set workspaceId - fetch all projects
    if (options?.archived) params.set('archived', 'true')
    if (options?.limit) params.set('limit', options.limit.toString())
    if (options?.offset) params.set('offset', options.offset.toString())

    const response = await fetch(`${API_BASE}?${params}`)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to fetch projects')
    }

    const { data } = await response.json()
    return (data as ProjectApiResponse[]).map(mapApiResponse)
  }

  /**
   * Get projects for a user in a specific workspace
   */
  async getUserProjects(
    userId: string,
    workspaceId: string | null,
    options?: {
      archived?: boolean
      limit?: number
      offset?: number
    }
  ): Promise<ProjectWithStats[]> {
    const params = new URLSearchParams({ userId })
    // Pass 'null' string to indicate Personal space
    params.set('workspaceId', workspaceId === null ? 'null' : workspaceId)
    if (options?.archived) params.set('archived', 'true')
    if (options?.limit) params.set('limit', options.limit.toString())
    if (options?.offset) params.set('offset', options.offset.toString())

    const response = await fetch(`${API_BASE}?${params}`)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to fetch projects')
    }

    const { data } = await response.json()
    return (data as ProjectApiResponse[]).map(mapApiResponse)
  }

  /**
   * Get all projects for a workspace
   */
  async getWorkspaceProjects(
    workspaceId: string,
    options?: {
      archived?: boolean
      limit?: number
      offset?: number
    }
  ): Promise<ProjectWithStats[]> {
    const params = new URLSearchParams({ workspaceId })
    if (options?.archived) params.set('archived', 'true')
    if (options?.limit) params.set('limit', options.limit.toString())
    if (options?.offset) params.set('offset', options.offset.toString())

    const response = await fetch(`${API_BASE}?${params}`)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to fetch projects')
    }

    const { data } = await response.json()
    return (data as ProjectApiResponse[]).map(mapApiResponse)
  }

  /**
   * Search projects
   */
  async searchProjects(
    userId: string,
    query: string,
    options?: {
      workspaceId?: string
      includeArchived?: boolean
      limit?: number
    }
  ): Promise<ProjectWithStats[]> {
    const params = new URLSearchParams({ userId, search: query })
    if (options?.workspaceId) params.set('workspaceId', options.workspaceId)
    if (options?.includeArchived) params.set('archived', 'true')
    if (options?.limit) params.set('limit', options.limit.toString())

    const response = await fetch(`${API_BASE}?${params}`)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to search projects')
    }

    const { data } = await response.json()
    return (data as ProjectApiResponse[]).map(mapApiResponse)
  }

  /**
   * Get a single project
   */
  async getProject(
    projectId: string,
    options?: {
      includeRelations?: boolean
      includeStats?: boolean
    }
  ): Promise<ProjectWithStats> {
    const params = new URLSearchParams()
    if (options?.includeRelations) params.set('relations', 'true')
    if (options?.includeStats) params.set('stats', 'true')

    const url = params.toString()
      ? `${API_BASE}/${projectId}?${params}`
      : `${API_BASE}/${projectId}`

    const response = await fetch(url)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to fetch project')
    }

    const { data } = await response.json()
    return mapApiResponse(data as ProjectApiResponse)
  }

  /**
   * Create a new project
   */
  async createProject(input: CreateProjectInput): Promise<ProjectWithStats> {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create project')
    }

    const { data } = await response.json()
    return mapApiResponse(data as ProjectApiResponse)
  }

  /**
   * Update a project
   */
  async updateProject(projectId: string, input: UpdateProjectInput): Promise<ProjectWithStats> {
    const response = await fetch(`${API_BASE}/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update project')
    }

    const { data } = await response.json()
    return mapApiResponse(data as ProjectApiResponse)
  }

  /**
   * Archive a project
   */
  async archiveProject(projectId: string): Promise<ProjectWithStats> {
    const response = await fetch(`${API_BASE}/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archive: true }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to archive project')
    }

    const { data } = await response.json()
    return mapApiResponse(data as ProjectApiResponse)
  }

  /**
   * Unarchive a project
   */
  async unarchiveProject(projectId: string): Promise<ProjectWithStats> {
    const response = await fetch(`${API_BASE}/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archive: false }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to unarchive project')
    }

    const { data } = await response.json()
    return mapApiResponse(data as ProjectApiResponse)
  }

  /**
   * Delete a project
   */
  async deleteProject(projectId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/${projectId}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to delete project')
    }
  }
}

export const projectApi = new ProjectApiClient()

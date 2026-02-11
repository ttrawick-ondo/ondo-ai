/**
 * Workspace API Client
 * Handles all workspace-related API calls
 */

import type { Workspace, WorkspaceMember, WorkspaceRole } from '@/types'

const API_BASE = '/api/workspaces'

// API response types
interface WorkspaceApiResponse {
  id: string
  name: string
  description?: string | null
  slug: string
  ownerId: string
  settings?: string | null
  createdAt: string
  updatedAt: string
  role?: string
  _count?: { members: number }
}

interface MemberApiResponse {
  id: string
  workspaceId: string
  userId: string
  role: string
  joinedAt: string
  user: {
    id: string
    email: string
    name?: string | null
    avatar?: string | null
    createdAt: string
    updatedAt: string
  }
}

// Map API response to frontend Workspace type
function mapWorkspaceResponse(data: WorkspaceApiResponse): Workspace {
  return {
    id: data.id,
    name: data.name,
    description: data.description || undefined,
    slug: data.slug,
    ownerId: data.ownerId,
    memberCount: data._count?.members || 1,
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt),
  }
}

// Map API response to frontend WorkspaceMember type
function mapMemberResponse(data: MemberApiResponse): WorkspaceMember {
  return {
    id: data.id,
    workspaceId: data.workspaceId,
    userId: data.userId,
    role: data.role as WorkspaceRole,
    joinedAt: new Date(data.joinedAt),
    user: {
      id: data.user.id,
      email: data.user.email,
      name: data.user.name || data.user.email.split('@')[0],
      createdAt: new Date(data.user.createdAt),
      updatedAt: new Date(data.user.updatedAt),
    },
  }
}

export interface CreateWorkspaceInput {
  name: string
  description?: string
  ownerId: string
  settings?: {
    defaultModel?: string
    allowedProviders?: string[]
    features?: Record<string, boolean>
  }
}

export interface UpdateWorkspaceInput {
  name?: string
  description?: string
  settings?: {
    defaultModel?: string
    allowedProviders?: string[]
    features?: Record<string, boolean>
  }
}

class WorkspaceApiClient {
  /**
   * Get all workspaces for a user
   */
  async getUserWorkspaces(userId: string): Promise<Workspace[]> {
    const params = new URLSearchParams({ userId })

    const response = await fetch(`${API_BASE}?${params}`)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to fetch workspaces')
    }

    const { data } = await response.json()
    return (data as WorkspaceApiResponse[]).map(mapWorkspaceResponse)
  }

  /**
   * Get a single workspace
   */
  async getWorkspace(
    workspaceId: string,
    options?: { includeMembers?: boolean }
  ): Promise<Workspace> {
    const params = new URLSearchParams()
    if (options?.includeMembers) params.set('members', 'true')

    const url = params.toString()
      ? `${API_BASE}/${workspaceId}?${params}`
      : `${API_BASE}/${workspaceId}`

    const response = await fetch(url)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to fetch workspace')
    }

    const { data } = await response.json()
    return mapWorkspaceResponse(data as WorkspaceApiResponse)
  }

  /**
   * Create a new workspace
   */
  async createWorkspace(input: CreateWorkspaceInput): Promise<Workspace> {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create workspace')
    }

    const { data } = await response.json()
    return mapWorkspaceResponse(data as WorkspaceApiResponse)
  }

  /**
   * Update a workspace
   */
  async updateWorkspace(
    workspaceId: string,
    input: UpdateWorkspaceInput
  ): Promise<Workspace> {
    const response = await fetch(`${API_BASE}/${workspaceId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update workspace')
    }

    const { data } = await response.json()
    return mapWorkspaceResponse(data as WorkspaceApiResponse)
  }

  /**
   * Delete a workspace
   */
  async deleteWorkspace(workspaceId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/${workspaceId}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to delete workspace')
    }
  }

  // ============================================================================
  // Members
  // ============================================================================

  /**
   * Get workspace members
   */
  async getMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    const response = await fetch(`${API_BASE}/${workspaceId}/members`)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to fetch members')
    }

    const { data } = await response.json()
    return (data as MemberApiResponse[]).map(mapMemberResponse)
  }

  /**
   * Add a member to workspace
   */
  async addMember(
    workspaceId: string,
    userId: string,
    role: WorkspaceRole = 'member'
  ): Promise<WorkspaceMember> {
    const response = await fetch(`${API_BASE}/${workspaceId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to add member')
    }

    const { data } = await response.json()
    return mapMemberResponse(data as MemberApiResponse)
  }

  /**
   * Update member role
   */
  async updateMemberRole(
    workspaceId: string,
    userId: string,
    role: WorkspaceRole
  ): Promise<WorkspaceMember> {
    const response = await fetch(`${API_BASE}/${workspaceId}/members`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update member role')
    }

    const { data } = await response.json()
    return mapMemberResponse(data as MemberApiResponse)
  }

  /**
   * Remove member from workspace
   */
  async removeMember(workspaceId: string, userId: string): Promise<void> {
    const params = new URLSearchParams({ userId })

    const response = await fetch(`${API_BASE}/${workspaceId}/members?${params}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to remove member')
    }
  }
}

export const workspaceApi = new WorkspaceApiClient()

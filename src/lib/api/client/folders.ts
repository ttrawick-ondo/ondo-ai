/**
 * Folder API Client
 * Handles all folder-related API calls
 */

import type { Folder } from '@/types'

const API_BASE = '/api/folders'

export interface CreateFolderInput {
  projectId: string
  parentId?: string | null
  name: string
  color?: string | null
  icon?: string | null
}

export interface UpdateFolderInput {
  name?: string
  color?: string | null
  icon?: string | null
  position?: number
  parentId?: string | null
}

export interface MoveFolderInput {
  targetParentId: string | null
  targetPosition?: number
}

class FolderApiClient {
  /**
   * Get all folders for a project
   */
  async getProjectFolders(projectId: string): Promise<Folder[]> {
    const response = await fetch(`${API_BASE}?projectId=${projectId}`)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to fetch folders')
    }

    const { data } = await response.json()
    return data
  }

  /**
   * Get folder tree for a project
   */
  async getFolderTree(projectId: string): Promise<Folder[]> {
    const response = await fetch(`${API_BASE}?projectId=${projectId}&tree=true`)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to fetch folder tree')
    }

    const { data } = await response.json()
    return data
  }

  /**
   * Get a single folder
   */
  async getFolder(folderId: string, includeChildren = false): Promise<Folder> {
    const url = includeChildren
      ? `${API_BASE}/${folderId}?children=true`
      : `${API_BASE}/${folderId}`

    const response = await fetch(url)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to fetch folder')
    }

    const { data } = await response.json()
    return data
  }

  /**
   * Create a new folder
   */
  async createFolder(input: CreateFolderInput): Promise<Folder> {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create folder')
    }

    const { data } = await response.json()
    return data
  }

  /**
   * Update a folder
   */
  async updateFolder(folderId: string, input: UpdateFolderInput): Promise<Folder> {
    const response = await fetch(`${API_BASE}/${folderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update folder')
    }

    const { data } = await response.json()
    return data
  }

  /**
   * Move a folder to a new parent
   */
  async moveFolder(folderId: string, input: MoveFolderInput): Promise<Folder> {
    const response = await fetch(`${API_BASE}/${folderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ move: input }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to move folder')
    }

    const { data } = await response.json()
    return data
  }

  /**
   * Delete a folder
   */
  async deleteFolder(folderId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/${folderId}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to delete folder')
    }
  }
}

export const folderApi = new FolderApiClient()

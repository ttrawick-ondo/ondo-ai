/**
 * Folder Types
 *
 * Supports nested folder hierarchy within projects for organizing conversations.
 */

export interface Folder {
  id: string
  projectId: string
  parentId?: string | null    // For nested subfolders
  name: string
  color?: string | null
  icon?: string | null
  position: number            // For ordering within parent
  depth: number               // Nesting level (0 = root folder)
  createdAt: Date
  updatedAt: Date
}

export interface FolderWithChildren extends Folder {
  children: FolderWithChildren[]
  conversationCount: number
}

export interface FolderTreeNode extends Folder {
  children: FolderTreeNode[]
  conversations: string[]     // Conversation IDs in this folder
  isExpanded: boolean
}

export interface CreateFolderInput {
  projectId: string
  parentId?: string | null
  name: string
  color?: string
  icon?: string
  position?: number
}

export interface UpdateFolderInput {
  name?: string
  color?: string | null
  icon?: string | null
  position?: number
  parentId?: string | null    // Move folder to different parent
}

export interface MoveFolderInput {
  targetParentId?: string | null  // null = move to root
  targetPosition?: number
}

export interface MoveConversationInput {
  conversationId: string
  targetFolderId?: string | null  // null = remove from folder
  targetProjectId?: string | null
}

export const FOLDER_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#84cc16', // lime
  '#22c55e', // green
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#a855f7', // purple
  '#ec4899', // pink
  '#64748b', // slate
] as const

export const FOLDER_ICONS = [
  'folder',
  'folder-open',
  'briefcase',
  'code',
  'file-text',
  'book',
  'star',
  'heart',
  'lightbulb',
  'target',
  'rocket',
  'zap',
  'settings',
  'archive',
] as const

export type FolderColor = (typeof FOLDER_COLORS)[number]
export type FolderIcon = (typeof FOLDER_ICONS)[number]

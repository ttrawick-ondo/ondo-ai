export type PromptVisibility = 'private' | 'workspace' | 'public'

export interface PromptVariable {
  name: string
  description?: string
  defaultValue?: string
  required: boolean
}

export interface Prompt {
  id: string
  title: string
  description?: string
  content: string
  variables: PromptVariable[]
  categoryId?: string
  tags: string[]
  visibility: PromptVisibility
  workspaceId?: string
  userId: string
  usageCount: number
  isFavorite: boolean
  createdAt: Date
  updatedAt: Date
}

export interface PromptCategory {
  id: string
  name: string
  icon?: string
  color?: string
  promptCount: number
}

export interface CreatePromptInput {
  title: string
  description?: string
  content: string
  variables?: PromptVariable[]
  categoryId?: string
  tags?: string[]
  visibility: PromptVisibility
  workspaceId?: string
}

export interface UpdatePromptInput {
  title?: string
  description?: string
  content?: string
  variables?: PromptVariable[]
  categoryId?: string
  tags?: string[]
  visibility?: PromptVisibility
}

export const DEFAULT_CATEGORIES: Omit<PromptCategory, 'promptCount'>[] = [
  { id: 'writing', name: 'Writing', icon: 'pen-tool', color: '#3b82f6' },
  { id: 'coding', name: 'Coding', icon: 'code', color: '#22c55e' },
  { id: 'analysis', name: 'Analysis', icon: 'bar-chart-2', color: '#f59e0b' },
  { id: 'creative', name: 'Creative', icon: 'sparkles', color: '#ec4899' },
  { id: 'business', name: 'Business', icon: 'briefcase', color: '#6366f1' },
  { id: 'learning', name: 'Learning', icon: 'graduation-cap', color: '#14b8a6' },
]

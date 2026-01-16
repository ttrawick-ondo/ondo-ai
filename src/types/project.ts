export interface Project {
  id: string
  name: string
  description?: string
  color: string
  icon?: string
  workspaceId?: string
  userId: string
  defaultPromptId?: string
  conversationCount: number
  createdAt: Date
  updatedAt: Date
}

export interface CreateProjectInput {
  name: string
  description?: string
  color?: string
  icon?: string
  workspaceId?: string
}

export interface UpdateProjectInput {
  name?: string
  description?: string
  color?: string
  icon?: string
  defaultPromptId?: string
}

export const PROJECT_COLORS = [
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
] as const

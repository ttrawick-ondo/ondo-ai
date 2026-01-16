export interface User {
  id: string
  email: string
  name: string
  avatarUrl?: string
  createdAt: Date
  updatedAt: Date
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  sendWithEnter: boolean
  showCodeLineNumbers: boolean
  defaultProjectId?: string
  defaultWorkspaceId?: string
  defaultModelId?: string
}

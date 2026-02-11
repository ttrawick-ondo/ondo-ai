/**
 * Query Keys
 * Centralized, type-safe query key management
 */

export const queryKeys = {
  // Workspaces
  workspaces: {
    all: ['workspaces'] as const,
    list: (userId: string) => ['workspaces', 'list', userId] as const,
    detail: (workspaceId: string) => ['workspaces', 'detail', workspaceId] as const,
    members: (workspaceId: string) => ['workspaces', 'members', workspaceId] as const,
  },

  // Prompts
  prompts: {
    all: ['prompts'] as const,
    list: (filters: { userId?: string; workspaceId?: string }) =>
      ['prompts', 'list', filters] as const,
    detail: (promptId: string) => ['prompts', 'detail', promptId] as const,
    categories: (workspaceId?: string) => ['prompts', 'categories', workspaceId] as const,
    search: (query: string, filters?: { workspaceId?: string }) =>
      ['prompts', 'search', query, filters] as const,
  },

  // Conversations
  conversations: {
    all: ['conversations'] as const,
    list: (filters: { userId: string; projectId?: string }) =>
      ['conversations', 'list', filters] as const,
    detail: (conversationId: string) => ['conversations', 'detail', conversationId] as const,
    messages: (conversationId: string) => ['conversations', 'messages', conversationId] as const,
    pinned: (userId: string, projectId?: string) =>
      ['conversations', 'pinned', userId, projectId] as const,
    recent: (userId: string) => ['conversations', 'recent', userId] as const,
    branches: (conversationId: string) => ['conversations', 'branches', conversationId] as const,
  },

  // Projects
  projects: {
    all: ['projects'] as const,
    list: (userId: string) => ['projects', 'list', userId] as const,
    detail: (projectId: string) => ['projects', 'detail', projectId] as const,
  },

  // Folders
  folders: {
    all: ['folders'] as const,
    list: (projectId: string) => ['folders', 'list', projectId] as const,
    detail: (folderId: string) => ['folders', 'detail', folderId] as const,
  },
} as const

export * from './user'
export * from './chat'
export * from './project'
export * from './workspace'
export * from './prompt'

// API response types
export interface ApiResponse<T> {
  data: T
  meta?: {
    page?: number
    perPage?: number
    total?: number
  }
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, string[]>
}

export interface PaginationParams {
  page?: number
  perPage?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// UI types
export type ModalType =
  | 'create-project'
  | 'create-workspace'
  | 'create-prompt'
  | 'invite-member'
  | 'settings'
  | 'confirm-delete'
  | null

export interface SidebarState {
  isOpen: boolean
  width: number
}

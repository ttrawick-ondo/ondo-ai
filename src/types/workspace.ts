import type { User } from './user'

export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer'

export interface Workspace {
  id: string
  name: string
  description?: string
  logoUrl?: string
  ownerId: string
  memberCount: number
  createdAt: Date
  updatedAt: Date
}

export interface WorkspaceMember {
  id: string
  workspaceId: string
  userId: string
  user: User
  role: WorkspaceRole
  joinedAt: Date
}

export interface WorkspaceInvite {
  id: string
  workspaceId: string
  email: string
  role: WorkspaceRole
  invitedBy: string
  expiresAt: Date
  acceptedAt?: Date
}

export interface CreateWorkspaceInput {
  name: string
  description?: string
}

export interface UpdateWorkspaceInput {
  name?: string
  description?: string
  logoUrl?: string
}

export const WORKSPACE_ROLE_PERMISSIONS: Record<WorkspaceRole, string[]> = {
  owner: ['manage_workspace', 'manage_members', 'manage_projects', 'delete_workspace'],
  admin: ['manage_members', 'manage_projects'],
  member: ['create_conversations', 'create_projects'],
  viewer: ['view_conversations'],
}

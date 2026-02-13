/**
 * Workspace Database Service
 *
 * Handles CRUD operations for workspaces and workspace members.
 */

import { prisma } from '../index'
import type { Workspace, WorkspaceMember, User } from '@/generated/prisma'
import { generateId } from '@/lib/utils'

export interface WorkspaceSettings {
  defaultModel?: string
  allowedProviders?: string[]
  features?: {
    gleanIntegration?: boolean
    slackIntegration?: boolean
  }
}

export interface CreateWorkspaceInput {
  name: string
  description?: string
  ownerId: string
  settings?: WorkspaceSettings
}

export interface UpdateWorkspaceInput {
  name?: string
  description?: string
  settings?: WorkspaceSettings
}

export interface WorkspaceMemberWithUser extends WorkspaceMember {
  user: User
}

export interface WorkspaceWithMembers extends Workspace {
  members: WorkspaceMemberWithUser[]
  _count?: { members: number }
}

// ============================================================================
// Workspaces
// ============================================================================

export async function createWorkspace(
  input: CreateWorkspaceInput
): Promise<Workspace> {
  // Generate a slug from the name
  const baseSlug = input.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  // Check for existing slugs and make unique if needed
  const existingSlug = await prisma.workspace.findUnique({
    where: { slug: baseSlug },
  })

  const slug = existingSlug ? `${baseSlug}-${generateId().slice(0, 6)}` : baseSlug

  // Create workspace and owner membership in a transaction
  const workspace = await prisma.$transaction(async (tx) => {
    const ws = await tx.workspace.create({
      data: {
        name: input.name,
        description: input.description,
        slug,
        ownerId: input.ownerId,
        settings: input.settings ? JSON.stringify(input.settings) : null,
      },
    })

    // Create owner membership
    await tx.workspaceMember.create({
      data: {
        workspaceId: ws.id,
        userId: input.ownerId,
        role: 'owner',
      },
    })

    return ws
  })

  return workspace
}

export async function getWorkspace(id: string): Promise<Workspace | null> {
  return prisma.workspace.findUnique({
    where: { id },
  })
}

export async function getWorkspaceBySlug(slug: string): Promise<Workspace | null> {
  return prisma.workspace.findUnique({
    where: { slug },
  })
}

export async function getWorkspaceWithMembers(
  id: string
): Promise<WorkspaceWithMembers | null> {
  return prisma.workspace.findUnique({
    where: { id },
    include: {
      members: {
        include: {
          user: true,
        },
        orderBy: { joinedAt: 'asc' },
      },
      _count: {
        select: { members: true },
      },
    },
  })
}

export async function getUserWorkspaces(userId: string): Promise<Workspace[]> {
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId },
    include: {
      workspace: true,
    },
    orderBy: { joinedAt: 'desc' },
  })

  return memberships.map((m) => m.workspace)
}

export async function getUserWorkspacesWithRole(
  userId: string
): Promise<Array<Workspace & { role: string }>> {
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId },
    include: {
      workspace: true,
    },
    orderBy: { joinedAt: 'desc' },
  })

  return memberships.map((m) => ({
    ...m.workspace,
    role: m.role,
  }))
}

export async function updateWorkspace(
  id: string,
  data: UpdateWorkspaceInput
): Promise<Workspace> {
  return prisma.workspace.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description,
      settings: data.settings ? JSON.stringify(data.settings) : undefined,
    },
  })
}

export async function deleteWorkspace(id: string): Promise<void> {
  await prisma.workspace.delete({
    where: { id },
  })
}

// ============================================================================
// Workspace Members
// ============================================================================

export async function getWorkspaceMembers(
  workspaceId: string
): Promise<WorkspaceMemberWithUser[]> {
  return prisma.workspaceMember.findMany({
    where: { workspaceId },
    include: {
      user: true,
    },
    orderBy: { joinedAt: 'asc' },
  })
}

export async function getWorkspaceMember(
  workspaceId: string,
  userId: string
): Promise<WorkspaceMember | null> {
  return prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId,
      },
    },
  })
}

export async function addWorkspaceMember(
  workspaceId: string,
  userId: string,
  role: 'admin' | 'member' = 'member',
  source: 'manual' | 'invitation' | 'okta_sync' = 'manual'
): Promise<WorkspaceMember> {
  // Update workspace member count
  await prisma.workspace.update({
    where: { id: workspaceId },
    data: { updatedAt: new Date() },
  })

  return prisma.workspaceMember.create({
    data: {
      workspaceId,
      userId,
      role,
      source,
    },
  })
}

export async function updateMemberRole(
  workspaceId: string,
  userId: string,
  role: 'admin' | 'member'
): Promise<WorkspaceMember> {
  return prisma.workspaceMember.update({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId,
      },
    },
    data: { role },
  })
}

export async function removeWorkspaceMember(
  workspaceId: string,
  userId: string
): Promise<void> {
  // Don't allow removing the owner
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  })

  if (workspace?.ownerId === userId) {
    throw new Error('Cannot remove workspace owner')
  }

  await prisma.workspaceMember.delete({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId,
      },
    },
  })
}

export async function isWorkspaceMember(
  workspaceId: string,
  userId: string
): Promise<boolean> {
  const member = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId,
      },
    },
  })

  return !!member
}

export async function hasWorkspacePermission(
  workspaceId: string,
  userId: string,
  requiredRole: 'owner' | 'admin' | 'member'
): Promise<boolean> {
  const member = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId,
      },
    },
  })

  if (!member) return false

  const roleHierarchy = { owner: 3, admin: 2, member: 1 }
  return roleHierarchy[member.role as keyof typeof roleHierarchy] >= roleHierarchy[requiredRole]
}

// ============================================================================
// Workspace Invitations
// ============================================================================

export async function createWorkspaceInvitation(
  workspaceId: string,
  email: string,
  role: 'admin' | 'member' = 'member',
  expiresInDays: number = 7
): Promise<{ id: string; token: string; expiresAt: Date }> {
  const token = generateId() + generateId() // Long random token
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + expiresInDays)

  const invitation = await prisma.workspaceInvitation.create({
    data: {
      workspaceId,
      email,
      role,
      token,
      expiresAt,
    },
  })

  return {
    id: invitation.id,
    token: invitation.token,
    expiresAt: invitation.expiresAt,
  }
}

export async function getWorkspaceInvitationByToken(token: string) {
  return prisma.workspaceInvitation.findUnique({
    where: { token },
    include: {
      workspace: true,
    },
  })
}

export async function acceptWorkspaceInvitation(
  token: string,
  userId: string
): Promise<WorkspaceMember> {
  const invitation = await prisma.workspaceInvitation.findUnique({
    where: { token },
  })

  if (!invitation) {
    throw new Error('Invitation not found')
  }

  if (invitation.acceptedAt) {
    throw new Error('Invitation already accepted')
  }

  if (new Date() > invitation.expiresAt) {
    throw new Error('Invitation expired')
  }

  // Accept invitation and add member in a transaction
  const member = await prisma.$transaction(async (tx) => {
    await tx.workspaceInvitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    })

    return tx.workspaceMember.create({
      data: {
        workspaceId: invitation.workspaceId,
        userId,
        role: invitation.role,
        source: 'invitation',
      },
    })
  })

  return member
}

export async function getPendingInvitations(
  workspaceId: string
): Promise<Array<{ id: string; email: string; role: string; expiresAt: Date }>> {
  const invitations = await prisma.workspaceInvitation.findMany({
    where: {
      workspaceId,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  })

  return invitations.map((inv) => ({
    id: inv.id,
    email: inv.email,
    role: inv.role,
    expiresAt: inv.expiresAt,
  }))
}

export async function deleteWorkspaceInvitation(id: string): Promise<void> {
  await prisma.workspaceInvitation.delete({
    where: { id },
  })
}

// ============================================================================
// Settings Helpers
// ============================================================================

export function parseWorkspaceSettings(workspace: Workspace): WorkspaceSettings {
  if (!workspace.settings) return {}
  try {
    return JSON.parse(workspace.settings) as WorkspaceSettings
  } catch {
    return {}
  }
}

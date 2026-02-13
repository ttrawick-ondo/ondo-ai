/**
 * Workspace Authorization Helpers
 *
 * Utilities for validating user access to workspaces and workspace-scoped resources.
 */

import { isWorkspaceMember } from '@/lib/db/services/workspace'

/**
 * Validates if a user has access to a workspace.
 * - If workspaceId is null, access is always granted (Personal space)
 * - Otherwise, checks workspace membership
 *
 * @param workspaceId - The workspace ID to check, or null for Personal space
 * @param userId - The user ID to check
 * @returns true if the user has access, false otherwise
 */
export async function validateWorkspaceAccess(
  workspaceId: string | null,
  userId: string
): Promise<boolean> {
  // Personal space - always accessible to the user
  if (!workspaceId) {
    return true
  }

  // Check workspace membership
  return isWorkspaceMember(workspaceId, userId)
}

/**
 * Requires workspace access, throwing an error if access is denied.
 *
 * @param workspaceId - The workspace ID to check, or null for Personal space
 * @param userId - The user ID to check
 * @throws Error if the user doesn't have access to the workspace
 */
export async function requireWorkspaceAccess(
  workspaceId: string | null,
  userId: string
): Promise<void> {
  const hasAccess = await validateWorkspaceAccess(workspaceId, userId)
  if (!hasAccess) {
    throw new Error('Access denied: You do not have access to this workspace')
  }
}

/**
 * Error class for workspace access denied errors.
 * Can be used for more specific error handling in API routes.
 */
export class WorkspaceAccessDeniedError extends Error {
  constructor(workspaceId: string) {
    super(`Access denied: You do not have access to workspace ${workspaceId}`)
    this.name = 'WorkspaceAccessDeniedError'
  }
}

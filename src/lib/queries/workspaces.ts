'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from './keys'
import { workspaceApi, type WorkspaceInvitation, type InvitationDetails } from '@/lib/api/client/workspaces'
import type { Workspace, WorkspaceMember, WorkspaceRole, User } from '@/types'

// ============================================================================
// Queries
// ============================================================================

export function useWorkspaces(userId: string) {
  return useQuery({
    queryKey: queryKeys.workspaces.list(userId),
    queryFn: () => workspaceApi.getUserWorkspaces(userId),
    enabled: !!userId,
  })
}

export function useWorkspace(workspaceId: string | null) {
  return useQuery({
    queryKey: queryKeys.workspaces.detail(workspaceId ?? ''),
    queryFn: () => workspaceApi.getWorkspace(workspaceId!),
    enabled: !!workspaceId,
  })
}

export function useWorkspaceMembers(workspaceId: string | null) {
  return useQuery({
    queryKey: queryKeys.workspaces.members(workspaceId ?? ''),
    queryFn: () => workspaceApi.getMembers(workspaceId!),
    enabled: !!workspaceId,
  })
}

// ============================================================================
// Mutations
// ============================================================================

export function useCreateWorkspace() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: workspaceApi.createWorkspace,
    onSuccess: (newWorkspace) => {
      // Invalidate workspace list to refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.all })
      toast.success('Workspace created')
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to create workspace'
      toast.error(message)
    },
  })
}

export function useUpdateWorkspace() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      workspaceId,
      data,
    }: {
      workspaceId: string
      data: { name?: string; description?: string }
    }) => workspaceApi.updateWorkspace(workspaceId, data),
    onMutate: async ({ workspaceId, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.workspaces.detail(workspaceId) })

      // Snapshot the previous value
      const previousWorkspace = queryClient.getQueryData<Workspace>(
        queryKeys.workspaces.detail(workspaceId)
      )

      // Optimistically update
      if (previousWorkspace) {
        queryClient.setQueryData(queryKeys.workspaces.detail(workspaceId), {
          ...previousWorkspace,
          ...data,
          updatedAt: new Date(),
        })
      }

      return { previousWorkspace }
    },
    onError: (error, { workspaceId }, context) => {
      // Rollback on error
      if (context?.previousWorkspace) {
        queryClient.setQueryData(
          queryKeys.workspaces.detail(workspaceId),
          context.previousWorkspace
        )
      }
      const message = error instanceof Error ? error.message : 'Failed to update workspace'
      toast.error(message)
    },
    onSettled: (_, __, { workspaceId }) => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.detail(workspaceId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.all })
    },
  })
}

export function useDeleteWorkspace() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (workspaceId: string) => workspaceApi.deleteWorkspace(workspaceId),
    onSuccess: (_, workspaceId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: queryKeys.workspaces.detail(workspaceId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.all })
      toast.success('Workspace deleted')
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to delete workspace'
      toast.error(message)
    },
  })
}

// ============================================================================
// Member Mutations
// ============================================================================

export function useUpdateMemberRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      workspaceId,
      userId,
      role,
    }: {
      workspaceId: string
      userId: string
      role: WorkspaceRole
    }) => workspaceApi.updateMemberRole(workspaceId, userId, role),
    onMutate: async ({ workspaceId, userId, role }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.workspaces.members(workspaceId) })

      const previousMembers = queryClient.getQueryData<WorkspaceMember[]>(
        queryKeys.workspaces.members(workspaceId)
      )

      if (previousMembers) {
        queryClient.setQueryData(
          queryKeys.workspaces.members(workspaceId),
          previousMembers.map((m) => (m.userId === userId ? { ...m, role } : m))
        )
      }

      return { previousMembers }
    },
    onError: (error, { workspaceId }, context) => {
      if (context?.previousMembers) {
        queryClient.setQueryData(
          queryKeys.workspaces.members(workspaceId),
          context.previousMembers
        )
      }
      const message = error instanceof Error ? error.message : 'Failed to update member role'
      toast.error(message)
    },
    onSettled: (_, __, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.members(workspaceId) })
    },
  })
}

export function useRemoveMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ workspaceId, userId }: { workspaceId: string; userId: string }) =>
      workspaceApi.removeMember(workspaceId, userId),
    onMutate: async ({ workspaceId, userId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.workspaces.members(workspaceId) })

      const previousMembers = queryClient.getQueryData<WorkspaceMember[]>(
        queryKeys.workspaces.members(workspaceId)
      )

      if (previousMembers) {
        queryClient.setQueryData(
          queryKeys.workspaces.members(workspaceId),
          previousMembers.filter((m) => m.userId !== userId)
        )
      }

      return { previousMembers }
    },
    onError: (error, { workspaceId }, context) => {
      if (context?.previousMembers) {
        queryClient.setQueryData(
          queryKeys.workspaces.members(workspaceId),
          context.previousMembers
        )
      }
      const message = error instanceof Error ? error.message : 'Failed to remove member'
      toast.error(message)
    },
    onSettled: (_, __, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.members(workspaceId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.detail(workspaceId) })
    },
  })
}

export function useAddMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      workspaceId,
      userId,
      role,
    }: {
      workspaceId: string
      userId: string
      role?: WorkspaceRole
    }) => workspaceApi.addMember(workspaceId, userId, role),
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.members(workspaceId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.detail(workspaceId) })
      toast.success('Member added')
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to add member'
      toast.error(message)
    },
  })
}

// ============================================================================
// User Search
// ============================================================================

export function useSearchUsers(query: string, excludeWorkspaceId?: string) {
  return useQuery({
    queryKey: queryKeys.users.search(query, excludeWorkspaceId),
    queryFn: () => workspaceApi.searchUsers(query, excludeWorkspaceId),
    enabled: query.length >= 2,
  })
}

// ============================================================================
// Invitation Queries
// ============================================================================

export function useWorkspaceInvitations(workspaceId: string | null) {
  return useQuery({
    queryKey: queryKeys.workspaces.invitations(workspaceId ?? ''),
    queryFn: () => workspaceApi.getInvitations(workspaceId!),
    enabled: !!workspaceId,
  })
}

export function useInvitationByToken(token: string | null) {
  return useQuery({
    queryKey: queryKeys.invitations.byToken(token ?? ''),
    queryFn: () => workspaceApi.getInvitationByToken(token!),
    enabled: !!token,
    retry: false,
  })
}

// ============================================================================
// Invitation Mutations
// ============================================================================

export function useCreateInvitation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      workspaceId,
      email,
      role,
    }: {
      workspaceId: string
      email: string
      role?: WorkspaceRole
    }) => workspaceApi.createInvitation(workspaceId, email, role),
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.invitations(workspaceId) })
      toast.success('Invitation sent')
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to send invitation'
      toast.error(message)
    },
  })
}

export function useDeleteInvitation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      workspaceId,
      invitationId,
    }: {
      workspaceId: string
      invitationId: string
    }) => workspaceApi.deleteInvitation(workspaceId, invitationId),
    onMutate: async ({ workspaceId, invitationId }) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.workspaces.invitations(workspaceId),
      })

      const previousInvitations = queryClient.getQueryData<WorkspaceInvitation[]>(
        queryKeys.workspaces.invitations(workspaceId)
      )

      if (previousInvitations) {
        queryClient.setQueryData(
          queryKeys.workspaces.invitations(workspaceId),
          previousInvitations.filter((inv) => inv.id !== invitationId)
        )
      }

      return { previousInvitations }
    },
    onError: (error, { workspaceId }, context) => {
      if (context?.previousInvitations) {
        queryClient.setQueryData(
          queryKeys.workspaces.invitations(workspaceId),
          context.previousInvitations
        )
      }
      const message = error instanceof Error ? error.message : 'Failed to cancel invitation'
      toast.error(message)
    },
    onSettled: (_, __, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.invitations(workspaceId) })
    },
  })
}

export function useAcceptInvitation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ token, userId }: { token: string; userId: string }) =>
      workspaceApi.acceptInvitation(token, userId),
    onSuccess: () => {
      // Invalidate all workspace queries to refresh the list
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.all })
      toast.success('Invitation accepted')
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to accept invitation'
      toast.error(message)
    },
  })
}

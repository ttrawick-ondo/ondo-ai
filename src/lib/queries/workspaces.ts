'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from './keys'
import { workspaceApi } from '@/lib/api/client/workspaces'
import type { Workspace, WorkspaceMember, WorkspaceRole } from '@/types'

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

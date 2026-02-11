'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from './keys'
import { promptApi } from '@/lib/api/client/prompts'
import type { Prompt, PromptCategory } from '@/types'

// ============================================================================
// Queries
// ============================================================================

export function usePrompts(filters: { userId?: string; workspaceId?: string }) {
  return useQuery({
    queryKey: queryKeys.prompts.list(filters),
    queryFn: () => {
      if (filters.workspaceId) {
        return promptApi.getWorkspacePrompts(filters.workspaceId, { includePublic: true })
      }
      if (filters.userId) {
        return promptApi.getUserPrompts(filters.userId)
      }
      return Promise.resolve([])
    },
    enabled: !!filters.userId || !!filters.workspaceId,
  })
}

export function usePrompt(promptId: string | null) {
  return useQuery({
    queryKey: queryKeys.prompts.detail(promptId ?? ''),
    queryFn: () => promptApi.getPrompt(promptId!),
    enabled: !!promptId,
  })
}

export function usePromptCategories(workspaceId?: string) {
  return useQuery({
    queryKey: queryKeys.prompts.categories(workspaceId),
    queryFn: () => promptApi.getCategories(workspaceId),
  })
}

export function useSearchPrompts(query: string, filters?: { workspaceId?: string }) {
  return useQuery({
    queryKey: queryKeys.prompts.search(query, filters),
    queryFn: () =>
      promptApi.searchPrompts(query, {
        workspaceId: filters?.workspaceId,
        includePublic: true,
      }),
    enabled: query.length > 0,
  })
}

// ============================================================================
// Mutations
// ============================================================================

export function useCreatePrompt() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: promptApi.createPrompt,
    onSuccess: (newPrompt) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.prompts.all })
      toast.success('Prompt created')
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to create prompt'
      toast.error(message)
    },
  })
}

export function useUpdatePrompt() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      promptId,
      data,
    }: {
      promptId: string
      data: {
        name?: string
        description?: string
        content?: string
        category?: string
        tags?: string[]
        isPublic?: boolean
      }
    }) => promptApi.updatePrompt(promptId, data),
    onMutate: async ({ promptId, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.prompts.detail(promptId) })

      const previousPrompt = queryClient.getQueryData<Prompt>(
        queryKeys.prompts.detail(promptId)
      )

      if (previousPrompt) {
        queryClient.setQueryData(queryKeys.prompts.detail(promptId), {
          ...previousPrompt,
          ...data,
          title: data.name ?? previousPrompt.title,
          categoryId: data.category ?? previousPrompt.categoryId,
          visibility: data.isPublic !== undefined
            ? (data.isPublic ? 'public' : 'private')
            : previousPrompt.visibility,
          updatedAt: new Date(),
        })
      }

      return { previousPrompt }
    },
    onError: (error, { promptId }, context) => {
      if (context?.previousPrompt) {
        queryClient.setQueryData(queryKeys.prompts.detail(promptId), context.previousPrompt)
      }
      const message = error instanceof Error ? error.message : 'Failed to update prompt'
      toast.error(message)
    },
    onSettled: (_, __, { promptId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.prompts.detail(promptId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.prompts.all })
    },
  })
}

export function useDeletePrompt() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (promptId: string) => promptApi.deletePrompt(promptId),
    onSuccess: (_, promptId) => {
      queryClient.removeQueries({ queryKey: queryKeys.prompts.detail(promptId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.prompts.all })
      toast.success('Prompt deleted')
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to delete prompt'
      toast.error(message)
    },
  })
}

export function useDuplicatePrompt() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ promptId, userId }: { promptId: string; userId: string }) =>
      promptApi.duplicatePrompt(promptId, userId),
    onSuccess: (newPrompt) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.prompts.all })
      toast.success('Prompt duplicated')
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to duplicate prompt'
      toast.error(message)
    },
  })
}

export function useIncrementPromptUsage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (promptId: string) => promptApi.incrementUsage(promptId),
    onMutate: async (promptId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.prompts.detail(promptId) })

      const previousPrompt = queryClient.getQueryData<Prompt>(
        queryKeys.prompts.detail(promptId)
      )

      if (previousPrompt) {
        queryClient.setQueryData(queryKeys.prompts.detail(promptId), {
          ...previousPrompt,
          usageCount: previousPrompt.usageCount + 1,
        })
      }

      return { previousPrompt }
    },
    onError: (_, promptId, context) => {
      if (context?.previousPrompt) {
        queryClient.setQueryData(queryKeys.prompts.detail(promptId), context.previousPrompt)
      }
    },
  })
}

'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from './keys'
import { conversationApi } from '@/lib/api/client/conversations'
import type { Conversation, Message } from '@/types'

// ============================================================================
// Queries
// ============================================================================

export function useConversations(filters: { userId: string; projectId?: string }) {
  return useQuery({
    queryKey: queryKeys.conversations.list(filters),
    queryFn: () =>
      conversationApi.getUserConversations(filters.userId, {
        projectId: filters.projectId,
      }),
    enabled: !!filters.userId,
  })
}

export function useConversation(conversationId: string | null) {
  return useQuery({
    queryKey: queryKeys.conversations.detail(conversationId ?? ''),
    queryFn: () => conversationApi.getConversation(conversationId!),
    enabled: !!conversationId,
  })
}

export function useMessages(conversationId: string | null) {
  return useQuery({
    queryKey: queryKeys.conversations.messages(conversationId ?? ''),
    queryFn: () => conversationApi.getMessages(conversationId!),
    enabled: !!conversationId,
  })
}

export function usePinnedConversations(userId: string, projectId?: string) {
  return useQuery({
    queryKey: queryKeys.conversations.pinned(userId, projectId),
    queryFn: () =>
      conversationApi.getPinnedConversations(userId, { projectId }),
    enabled: !!userId,
  })
}

export function useRecentConversations(userId: string, limit = 10) {
  return useQuery({
    queryKey: queryKeys.conversations.recent(userId),
    queryFn: () =>
      conversationApi.getRecentConversations(userId, { limit }),
    enabled: !!userId,
  })
}

// ============================================================================
// Mutations
// ============================================================================

export function useCreateConversation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: conversationApi.createConversation,
    onSuccess: (newConversation) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all })
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to create conversation'
      toast.error(message)
    },
  })
}

export function useUpdateConversation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      conversationId,
      data,
    }: {
      conversationId: string
      data: {
        title?: string
        model?: string
        projectId?: string | null
        folderId?: string | null
      }
    }) => conversationApi.updateConversation(conversationId, data),
    onMutate: async ({ conversationId, data }) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.conversations.detail(conversationId),
      })

      const previousConversation = queryClient.getQueryData<Conversation>(
        queryKeys.conversations.detail(conversationId)
      )

      if (previousConversation) {
        queryClient.setQueryData(queryKeys.conversations.detail(conversationId), {
          ...previousConversation,
          ...data,
          modelId: data.model ?? previousConversation.modelId,
          updatedAt: new Date(),
        })
      }

      return { previousConversation }
    },
    onError: (error, { conversationId }, context) => {
      if (context?.previousConversation) {
        queryClient.setQueryData(
          queryKeys.conversations.detail(conversationId),
          context.previousConversation
        )
      }
      const message = error instanceof Error ? error.message : 'Failed to update conversation'
      toast.error(message)
    },
    onSettled: (_, __, { conversationId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.detail(conversationId),
      })
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all })
    },
  })
}

export function useDeleteConversation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (conversationId: string) =>
      conversationApi.deleteConversation(conversationId),
    onSuccess: (_, conversationId) => {
      queryClient.removeQueries({
        queryKey: queryKeys.conversations.detail(conversationId),
      })
      queryClient.removeQueries({
        queryKey: queryKeys.conversations.messages(conversationId),
      })
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all })
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to delete conversation'
      toast.error(message)
    },
  })
}

export function useTogglePin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (conversationId: string) => conversationApi.togglePin(conversationId),
    onMutate: async (conversationId) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.conversations.detail(conversationId),
      })

      const previousConversation = queryClient.getQueryData<Conversation>(
        queryKeys.conversations.detail(conversationId)
      )

      if (previousConversation) {
        queryClient.setQueryData(queryKeys.conversations.detail(conversationId), {
          ...previousConversation,
          pinned: !previousConversation.pinned,
        })
      }

      return { previousConversation }
    },
    onError: (error, conversationId, context) => {
      if (context?.previousConversation) {
        queryClient.setQueryData(
          queryKeys.conversations.detail(conversationId),
          context.previousConversation
        )
      }
      const message = error instanceof Error ? error.message : 'Failed to toggle pin'
      toast.error(message)
    },
    onSettled: (_, __, conversationId) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.detail(conversationId),
      })
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all })
    },
  })
}

export function useBranchConversation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      conversationId,
      branchPointMessageId,
      title,
      userId,
    }: {
      conversationId: string
      branchPointMessageId: string
      title?: string
      userId?: string
    }) =>
      conversationApi.branchConversation(
        conversationId,
        branchPointMessageId,
        title,
        userId
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all })
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to branch conversation'
      toast.error(message)
    },
  })
}

// ============================================================================
// Message Mutations
// ============================================================================

export function useCreateMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      conversationId,
      data,
    }: {
      conversationId: string
      data: Parameters<typeof conversationApi.createMessage>[1]
    }) => conversationApi.createMessage(conversationId, data),
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.messages(conversationId),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.detail(conversationId),
      })
    },
  })
}

// ============================================================================
// Cache Utilities
// ============================================================================

/**
 * Add a message to the conversation's message cache
 * Used for optimistic updates during streaming
 */
export function useAddMessageToCache() {
  const queryClient = useQueryClient()

  return (conversationId: string, message: Message) => {
    queryClient.setQueryData<Message[]>(
      queryKeys.conversations.messages(conversationId),
      (old) => (old ? [...old, message] : [message])
    )
  }
}

/**
 * Update a specific message in the cache
 */
export function useUpdateMessageInCache() {
  const queryClient = useQueryClient()

  return (conversationId: string, messageId: string, updates: Partial<Message>) => {
    queryClient.setQueryData<Message[]>(
      queryKeys.conversations.messages(conversationId),
      (old) =>
        old?.map((msg) => (msg.id === messageId ? { ...msg, ...updates } : msg))
    )
  }
}

/**
 * Invalidate conversation caches (call after streaming completes)
 */
export function useInvalidateConversation() {
  const queryClient = useQueryClient()

  return (conversationId: string) => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.conversations.messages(conversationId),
    })
    queryClient.invalidateQueries({
      queryKey: queryKeys.conversations.detail(conversationId),
    })
  }
}

import { useMemo } from 'react'
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { toast } from 'sonner'
import type { Conversation, Message, SendMessageInput, AIProvider, ToolCall, ToolExecutionRecord } from '@/types'
import { generateId } from '@/lib/utils'
import { conversationApi } from '@/lib/api/client/conversations'
import { registerBuiltinTools } from '@/lib/tools'
import {
  streamChat,
  buildApiMessages,
  createUserMessage,
  getProviderFromModelId,
  persistMessage,
} from '@/lib/services/chat-streaming'
import { executeToolCalls as executeToolCallsService } from '@/lib/services/tool-execution'
import { useRoutingStore } from './routingStore'

// Register built-in tools on module load
registerBuiltinTools()

interface ChatState {
  conversations: Record<string, Conversation>
  activeConversationId: string | null
  messagesByConversation: Record<string, Message[]>
  isStreaming: boolean
  streamingMessage: string
  isLoading: boolean
  isSyncing: boolean
  isInitialized: boolean
  // Tool-related state
  enabledTools: string[]
  isExecutingTools: boolean
  pendingToolCalls: ToolCall[]
}

interface ChatActions {
  setActiveConversation: (id: string | null) => void
  createConversation: (title?: string, projectId?: string, modelId?: string, folderId?: string | null) => Promise<string>
  deleteConversation: (id: string) => Promise<void>
  updateConversationTitle: (id: string, title: string) => Promise<void>
  updateConversationModel: (id: string, modelId: string) => Promise<void>
  sendMessage: (input: SendMessageInput) => Promise<void>
  clearConversation: (id: string) => void
  loadConversations: (conversations: Conversation[]) => void
  fetchUserConversations: (userId: string, projectId?: string) => Promise<void>
  loadConversationMessages: (conversationId: string) => Promise<void>
  // Tool-related actions
  setEnabledTools: (toolNames: string[]) => void
  executeToolCalls: (toolCalls: ToolCall[]) => Promise<ToolExecutionRecord[]>
  // Folder & organization actions
  moveConversationToFolder: (conversationId: string, folderId: string | null, projectId?: string | null) => Promise<void>
  moveConversationToProject: (conversationId: string, projectId: string | null) => Promise<void>
  // Pinning actions
  toggleConversationPinned: (id: string) => Promise<void>
  // Branching actions
  branchConversation: (sourceId: string, branchPointMessageId: string, title?: string) => Promise<string>
  // Search
  searchConversations: (query: string, projectId?: string) => Conversation[]
}

type ChatStore = ChatState & { actions: ChatActions }

export const useChatStore = create<ChatStore>()(
  devtools(
    persist(
      (set, get) => ({
        conversations: {},
        activeConversationId: null,
        messagesByConversation: {},
        isStreaming: false,
        streamingMessage: '',
        isLoading: false,
        isSyncing: false,
        isInitialized: false,
        // Tool-related initial state
        enabledTools: [],
        isExecutingTools: false,
        pendingToolCalls: [],

        actions: {
          setActiveConversation: (id) => {
            set({ activeConversationId: id })
          },

          createConversation: async (title = 'New conversation', projectId, modelId, folderId = null) => {
            const tempId = `conv-${generateId()}`
            const now = new Date()

            const conversation: Conversation = {
              id: tempId,
              title,
              projectId,
              folderId,
              modelId,
              userId: 'user-1',
              messageCount: 0,
              lastMessageAt: now,
              createdAt: now,
              updatedAt: now,
              pinned: false,
              archived: false,
              parentId: null,
              branchPointId: null,
            }

            // Optimistic update
            set((state) => ({
              conversations: { ...state.conversations, [tempId]: conversation },
              messagesByConversation: { ...state.messagesByConversation, [tempId]: [] },
              activeConversationId: tempId,
              isSyncing: true,
            }))

            try {
              // Call API
              const created = await conversationApi.createConversation({
                userId: 'user-1',
                projectId: projectId || undefined,
                folderId,
                title,
                model: modelId || 'claude-sonnet-4-20250514',
                provider: 'anthropic',
              })

              // Replace temp with real - API client already maps to correct Conversation type
              set((state) => {
                const { [tempId]: _, ...restConvs } = state.conversations
                const { [tempId]: __, ...restMsgs } = state.messagesByConversation

                return {
                  conversations: { ...restConvs, [created.id]: created },
                  messagesByConversation: { ...restMsgs, [created.id]: [] },
                  activeConversationId: created.id,
                  isSyncing: false,
                }
              })

              return created.id
            } catch (error) {
              // Rollback
              set((state) => {
                const { [tempId]: _, ...restConvs } = state.conversations
                const { [tempId]: __, ...restMsgs } = state.messagesByConversation
                return {
                  conversations: restConvs,
                  messagesByConversation: restMsgs,
                  activeConversationId: null,
                  isSyncing: false,
                }
              })

              const message = error instanceof Error ? error.message : 'Failed to create conversation'
              toast.error(message)
              throw error
            }
          },

          deleteConversation: async (id) => {
            const existing = get().conversations[id]
            const existingMessages = get().messagesByConversation[id]
            if (!existing) return

            // Optimistic delete
            set((state) => {
              const { [id]: _, ...conversations } = state.conversations
              const { [id]: __, ...messagesByConversation } = state.messagesByConversation

              return {
                conversations,
                messagesByConversation,
                activeConversationId:
                  state.activeConversationId === id ? null : state.activeConversationId,
                isSyncing: true,
              }
            })

            try {
              await conversationApi.deleteConversation(id)
              set({ isSyncing: false })
            } catch (error) {
              // Rollback
              set((state) => ({
                conversations: { ...state.conversations, [id]: existing },
                messagesByConversation: { ...state.messagesByConversation, [id]: existingMessages || [] },
                isSyncing: false,
              }))

              const message = error instanceof Error ? error.message : 'Failed to delete conversation'
              toast.error(message)
              throw error
            }
          },

          updateConversationTitle: async (id, title) => {
            const existing = get().conversations[id]
            if (!existing) return

            // Optimistic update
            set((state) => ({
              conversations: {
                ...state.conversations,
                [id]: { ...state.conversations[id], title, updatedAt: new Date() },
              },
              isSyncing: true,
            }))

            try {
              await conversationApi.updateConversation(id, { title })
              set({ isSyncing: false })
            } catch (error) {
              // Rollback
              set((state) => ({
                conversations: { ...state.conversations, [id]: existing },
                isSyncing: false,
              }))

              const message = error instanceof Error ? error.message : 'Failed to update title'
              toast.error(message)
              throw error
            }
          },

          updateConversationModel: async (id, modelId) => {
            const existing = get().conversations[id]
            if (!existing) return

            // Optimistic update
            set((state) => ({
              conversations: {
                ...state.conversations,
                [id]: { ...state.conversations[id], modelId, updatedAt: new Date() },
              },
              isSyncing: true,
            }))

            try {
              await conversationApi.updateConversation(id, { model: modelId })
              set({ isSyncing: false })
            } catch (error) {
              // Rollback on failure
              set((state) => ({
                conversations: { ...state.conversations, [id]: existing },
                isSyncing: false,
              }))
              const message = error instanceof Error ? error.message : 'Failed to update model'
              toast.error(message)
            }
          },

          sendMessage: async (input) => {
            const { activeConversationId, conversations, messagesByConversation, enabledTools } = get()
            if (!activeConversationId) return

            const conversation = conversations[activeConversationId]
            const modelId = input.modelId || conversation.modelId || 'claude-sonnet-4-20250514'
            const provider = getProviderFromModelId(modelId)

            // Create and add user message
            const userMessage = createUserMessage(activeConversationId, input.content, input.attachments)
            const userMessageId = userMessage.id
            const now = new Date()

            set((state) => ({
              messagesByConversation: {
                ...state.messagesByConversation,
                [activeConversationId]: [
                  ...(state.messagesByConversation[activeConversationId] || []),
                  userMessage,
                ],
              },
              conversations: {
                ...state.conversations,
                [activeConversationId]: {
                  ...state.conversations[activeConversationId],
                  messageCount: state.conversations[activeConversationId].messageCount + 1,
                  lastMessageAt: now,
                  updatedAt: now,
                  title:
                    state.conversations[activeConversationId].messageCount === 0
                      ? input.content.slice(0, 50) + (input.content.length > 50 ? '...' : '')
                      : state.conversations[activeConversationId].title,
                },
              },
            }))

            // Persist user message to database
            persistMessage(activeConversationId, userMessage)
              .then((dbId) => {
                set((state) => {
                  const messages = state.messagesByConversation[activeConversationId] || []
                  return {
                    messagesByConversation: {
                      ...state.messagesByConversation,
                      [activeConversationId]: messages.map((msg) =>
                        msg.id === userMessageId ? { ...msg, id: dbId } : msg
                      ),
                    },
                  }
                })
              })
              .catch(console.error)

            // Update conversation title if first message
            if (conversation.messageCount === 0) {
              const newTitle = input.content.slice(0, 50) + (input.content.length > 50 ? '...' : '')
              conversationApi.updateConversation(activeConversationId, { title: newTitle }).catch(console.error)
            }

            // Start streaming
            set({ isStreaming: true, streamingMessage: '' })

            // Build API messages
            const existingMessages = messagesByConversation[activeConversationId] || []
            const apiMessages = buildApiMessages([...existingMessages, userMessage])

            // Get routing options
            const routingState = useRoutingStore.getState()
            const routingOptions = routingState.actions.getRoutingOptions()

            // Stream the chat
            await streamChat(
              {
                conversationId: activeConversationId,
                messages: apiMessages,
                provider,
                modelId,
                tools: input.tools || enabledTools,
                toolChoice: input.tool_choice,
                routingOptions,
              },
              {
                onStreamStart: () => {
                  set({ streamingMessage: '' })
                },
                onStreamDelta: (_delta, fullContent) => {
                  set({ streamingMessage: fullContent })
                },
                onStreamComplete: () => {
                  set({ isStreaming: false, streamingMessage: '' })
                },
                onMessageCreated: (message) => {
                  set((state) => ({
                    messagesByConversation: {
                      ...state.messagesByConversation,
                      [activeConversationId]: [
                        ...(state.messagesByConversation[activeConversationId] || []),
                        message,
                      ],
                    },
                    conversations: {
                      ...state.conversations,
                      [activeConversationId]: {
                        ...state.conversations[activeConversationId],
                        messageCount: state.conversations[activeConversationId].messageCount + 1,
                        lastMessageAt: new Date(),
                        updatedAt: new Date(),
                      },
                    },
                  }))
                },
                onToolsExecuting: (toolCalls) => {
                  set({ isExecutingTools: true, pendingToolCalls: toolCalls })
                },
                onToolsComplete: () => {
                  set({ isExecutingTools: false, pendingToolCalls: [] })
                },
                onRoutingInfo: (info) => {
                  useRoutingStore.getState().actions.setLastRouteInfo({
                    intent: info.intent,
                    confidence: info.confidence,
                    provider,
                    wasAutoRouted: info.wasAutoRouted,
                  })
                },
                onError: (error) => {
                  console.error('Chat error:', error)
                  const errorMessage: Message = {
                    id: `msg-${generateId()}`,
                    conversationId: activeConversationId,
                    role: 'assistant',
                    content: `Sorry, there was an error processing your request: ${error}`,
                    createdAt: new Date(),
                  }
                  set((state) => ({
                    messagesByConversation: {
                      ...state.messagesByConversation,
                      [activeConversationId]: [
                        ...(state.messagesByConversation[activeConversationId] || []),
                        errorMessage,
                      ],
                    },
                    isStreaming: false,
                    streamingMessage: '',
                  }))
                },
              }
            )
          },

          clearConversation: (id) => {
            set((state) => ({
              messagesByConversation: {
                ...state.messagesByConversation,
                [id]: [],
              },
              conversations: {
                ...state.conversations,
                [id]: {
                  ...state.conversations[id],
                  messageCount: 0,
                  updatedAt: new Date(),
                },
              },
            }))
          },

          loadConversations: (conversations) => {
            const conversationsRecord = conversations.reduce((acc, conv) => {
              acc[conv.id] = conv
              return acc
            }, {} as Record<string, Conversation>)

            set({ conversations: conversationsRecord, isInitialized: true })
          },

          fetchUserConversations: async (userId, projectId) => {
            set({ isLoading: true })
            try {
              // API client already maps to Conversation type with modelId
              const conversations = await conversationApi.getUserConversations(userId, {
                projectId,
              })

              get().actions.loadConversations(conversations)
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Failed to load conversations'
              toast.error(message)
            } finally {
              set({ isLoading: false })
            }
          },

          loadConversationMessages: async (conversationId) => {
            // Skip if messages are already loaded for this conversation
            const existingMessages = get().messagesByConversation[conversationId]
            if (existingMessages && existingMessages.length > 0) {
              return
            }

            set({ isLoading: true })
            try {
              const messages = await conversationApi.getMessages(conversationId)

              // Map API response to Message type with proper date handling
              const mappedMessages: Message[] = messages.map((msg) => ({
                ...msg,
                createdAt: new Date(msg.createdAt),
              }))

              set((state) => ({
                messagesByConversation: {
                  ...state.messagesByConversation,
                  [conversationId]: mappedMessages,
                },
                // Update conversation message count if we have the conversation
                conversations: state.conversations[conversationId]
                  ? {
                      ...state.conversations,
                      [conversationId]: {
                        ...state.conversations[conversationId],
                        messageCount: mappedMessages.length,
                      },
                    }
                  : state.conversations,
              }))
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Failed to load messages'
              toast.error(message)
            } finally {
              set({ isLoading: false })
            }
          },

          setEnabledTools: (toolNames: string[]) => {
            set({ enabledTools: toolNames })
          },

          executeToolCalls: async (toolCalls: ToolCall[]) => {
            set({ isExecutingTools: true, pendingToolCalls: toolCalls })

            try {
              const results = await executeToolCallsService(toolCalls, { parallel: true })
              set({ isExecutingTools: false, pendingToolCalls: [] })
              return results
            } catch (error) {
              set({ isExecutingTools: false, pendingToolCalls: [] })
              throw error
            }
          },

          moveConversationToFolder: async (conversationId, folderId, projectId) => {
            const existing = get().conversations[conversationId]
            if (!existing) return

            // Optimistic update
            set((state) => ({
              conversations: {
                ...state.conversations,
                [conversationId]: {
                  ...existing,
                  folderId,
                  projectId: projectId !== undefined ? projectId : existing.projectId,
                  updatedAt: new Date(),
                },
              },
              isSyncing: true,
            }))

            try {
              await conversationApi.updateConversation(conversationId, {
                folderId,
                projectId: projectId !== undefined ? projectId : undefined,
              })
              set({ isSyncing: false })
            } catch (error) {
              // Rollback
              set((state) => ({
                conversations: { ...state.conversations, [conversationId]: existing },
                isSyncing: false,
              }))

              const message = error instanceof Error ? error.message : 'Failed to move conversation'
              toast.error(message)
              throw error
            }
          },

          moveConversationToProject: async (conversationId, projectId) => {
            const existing = get().conversations[conversationId]
            if (!existing) return

            // Optimistic update
            set((state) => ({
              conversations: {
                ...state.conversations,
                [conversationId]: {
                  ...existing,
                  projectId,
                  folderId: null, // Remove from folder when moving to different project
                  updatedAt: new Date(),
                },
              },
              isSyncing: true,
            }))

            try {
              await conversationApi.updateConversation(conversationId, {
                projectId,
                folderId: null,
              })
              set({ isSyncing: false })
            } catch (error) {
              // Rollback
              set((state) => ({
                conversations: { ...state.conversations, [conversationId]: existing },
                isSyncing: false,
              }))

              const message = error instanceof Error ? error.message : 'Failed to move conversation'
              toast.error(message)
              throw error
            }
          },

          toggleConversationPinned: async (id) => {
            const existing = get().conversations[id]
            if (!existing) return

            // Optimistic update
            set((state) => ({
              conversations: {
                ...state.conversations,
                [id]: {
                  ...existing,
                  pinned: !existing.pinned,
                  updatedAt: new Date(),
                },
              },
              isSyncing: true,
            }))

            try {
              await conversationApi.togglePin(id)
              set({ isSyncing: false })
            } catch (error) {
              // Rollback
              set((state) => ({
                conversations: { ...state.conversations, [id]: existing },
                isSyncing: false,
              }))

              const message = error instanceof Error ? error.message : 'Failed to toggle pin'
              toast.error(message)
              throw error
            }
          },

          branchConversation: async (sourceId, branchPointMessageId, title) => {
            const state = get()
            const sourceConversation = state.conversations[sourceId]
            const sourceMessages = state.messagesByConversation[sourceId] || []

            if (!sourceConversation) {
              throw new Error(`Source conversation ${sourceId} not found`)
            }

            // Find the branch point message index
            const branchPointIndex = sourceMessages.findIndex(
              (m) => m.id === branchPointMessageId
            )
            if (branchPointIndex === -1) {
              throw new Error(`Branch point message ${branchPointMessageId} not found`)
            }

            // Create temp ID for optimistic update
            const tempId = `conv-${generateId()}`
            const now = new Date()
            const branchTitle = title || `Branch of ${sourceConversation.title}`

            // Copy messages up to and including the branch point
            const copiedMessages = sourceMessages.slice(0, branchPointIndex + 1).map((msg) => ({
              ...msg,
              id: `msg-${generateId()}`,
              conversationId: tempId,
              createdAt: new Date(msg.createdAt),
            }))

            const tempConversation: Conversation = {
              id: tempId,
              title: branchTitle,
              projectId: sourceConversation.projectId,
              folderId: sourceConversation.folderId,
              modelId: sourceConversation.modelId,
              userId: sourceConversation.userId,
              messageCount: copiedMessages.length,
              lastMessageAt: now,
              createdAt: now,
              updatedAt: now,
              pinned: false,
              archived: false,
              parentId: sourceId,
              branchPointId: branchPointMessageId,
            }

            // Optimistic update
            set((state) => ({
              conversations: { ...state.conversations, [tempId]: tempConversation },
              messagesByConversation: { ...state.messagesByConversation, [tempId]: copiedMessages },
              activeConversationId: tempId,
              isSyncing: true,
            }))

            try {
              // Call API - returns Conversation with modelId already mapped
              const branch = await conversationApi.branchConversation(
                sourceId,
                branchPointMessageId,
                title,
                sourceConversation.userId
              )

              // Replace temp with real
              set((state) => {
                const { [tempId]: _, ...restConvs } = state.conversations
                const { [tempId]: __, ...restMsgs } = state.messagesByConversation

                // Update message IDs to use new conversation ID
                const newMessages = copiedMessages.map((msg) => ({
                  ...msg,
                  conversationId: branch.id,
                }))

                return {
                  conversations: {
                    ...restConvs,
                    [branch.id]: { ...branch, messageCount: copiedMessages.length },
                  },
                  messagesByConversation: { ...restMsgs, [branch.id]: newMessages },
                  activeConversationId: branch.id,
                  isSyncing: false,
                }
              })

              return branch.id
            } catch (error) {
              // Rollback
              set((state) => {
                const { [tempId]: _, ...restConvs } = state.conversations
                const { [tempId]: __, ...restMsgs } = state.messagesByConversation
                return {
                  conversations: restConvs,
                  messagesByConversation: restMsgs,
                  activeConversationId: sourceId,
                  isSyncing: false,
                }
              })

              const message = error instanceof Error ? error.message : 'Failed to branch conversation'
              toast.error(message)
              throw error
            }
          },

          searchConversations: (query, projectId) => {
            const state = get()
            const lowercaseQuery = query.toLowerCase()

            return Object.values(state.conversations).filter((conv) => {
              // Filter by project if specified
              if (projectId !== undefined && conv.projectId !== projectId) {
                return false
              }

              // Search in title
              if (conv.title.toLowerCase().includes(lowercaseQuery)) {
                return true
              }

              // Search in messages
              const messages = state.messagesByConversation[conv.id] || []
              return messages.some((msg) =>
                msg.content.toLowerCase().includes(lowercaseQuery)
              )
            })
          },
        },
      }),
      {
        name: 'chat-store',
        partialize: (state) => ({
          // Only persist activeConversationId, not conversations (they come from DB)
          activeConversationId: state.activeConversationId,
          enabledTools: state.enabledTools,
        }),
      }
    ),
    { name: 'chat-store' }
  )
)

// Selector hooks for optimized re-renders
export const useActiveConversation = () =>
  useChatStore((state) =>
    state.activeConversationId ? state.conversations[state.activeConversationId] : null
  )

export const useConversations = (): Conversation[] => {
  const conversations = useChatStore((state) => state.conversations)
  return useMemo(() => Object.values(conversations), [conversations])
}

const EMPTY_MESSAGES: import('@/types').Message[] = []
export const useMessages = (conversationId: string) =>
  useChatStore((state) => state.messagesByConversation[conversationId] ?? EMPTY_MESSAGES)

export const useIsStreaming = () => useChatStore((state) => state.isStreaming)

export const useStreamingMessage = () => useChatStore((state) => state.streamingMessage)

export const useEnabledTools = () => useChatStore((state) => state.enabledTools)

export const useIsExecutingTools = () => useChatStore((state) => state.isExecutingTools)

export const usePendingToolCalls = () => useChatStore((state) => state.pendingToolCalls)

export const useChatLoading = (): boolean => {
  return useChatStore((state) => state.isLoading)
}

export const useChatSyncing = (): boolean => {
  return useChatStore((state) => state.isSyncing)
}

export const useConversationsInitialized = (): boolean => {
  return useChatStore((state) => state.isInitialized)
}

// Return actions directly from store - they're stable references
export const useChatActions = () => useChatStore.getState().actions

// Pinned conversations selector
export const usePinnedConversations = (): Conversation[] => {
  const conversations = useChatStore((state) => state.conversations)
  return useMemo(
    () =>
      Object.values(conversations)
        .filter((c) => c.pinned && !c.archived)
        .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()),
    [conversations]
  )
}

// Conversations by folder selector
export const useConversationsByFolder = (folderId: string | null): Conversation[] => {
  const conversations = useChatStore((state) => state.conversations)
  return useMemo(
    () =>
      Object.values(conversations)
        .filter((c) => c.folderId === folderId && !c.archived)
        .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()),
    [conversations, folderId]
  )
}

// Conversations by project (not in any folder)
export const useUnorganizedConversations = (projectId: string): Conversation[] => {
  const conversations = useChatStore((state) => state.conversations)
  return useMemo(
    () =>
      Object.values(conversations)
        .filter((c) => c.projectId === projectId && !c.folderId && !c.archived)
        .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()),
    [conversations, projectId]
  )
}

// Recent conversations (no project)
export const useRecentConversations = (limit = 10): Conversation[] => {
  const conversations = useChatStore((state) => state.conversations)
  return useMemo(
    () =>
      Object.values(conversations)
        .filter((c) => !c.projectId && !c.archived)
        .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
        .slice(0, limit),
    [conversations, limit]
  )
}

// Conversation branches selector
export const useConversationBranches = (conversationId: string): Conversation[] => {
  const conversations = useChatStore((state) => state.conversations)
  return useMemo(
    () =>
      Object.values(conversations)
        .filter((c) => c.parentId === conversationId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [conversations, conversationId]
  )
}

// Parent conversation selector
export const useParentConversation = (conversationId: string): Conversation | null => {
  const conversations = useChatStore((state) => state.conversations)
  const conversation = conversations[conversationId]
  return conversation?.parentId ? conversations[conversation.parentId] ?? null : null
}

// Conversations by project
export const useConversationsByProject = (projectId: string | null): Conversation[] => {
  const conversations = useChatStore((state) => state.conversations)
  return useMemo(
    () =>
      Object.values(conversations)
        .filter((c) => c.projectId === projectId && !c.archived)
        .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()),
    [conversations, projectId]
  )
}

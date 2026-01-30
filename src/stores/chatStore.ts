import { useMemo } from 'react'
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { Conversation, Message, SendMessageInput, AIProvider, ToolCall, ToolExecutionRecord } from '@/types'
import { mockConversations, mockMessages } from '@/lib/mocks/data'
import { generateId } from '@/lib/utils'
import { chatClient, type RoutingInfo } from '@/lib/api/client'
import { toolRegistry, registerBuiltinTools } from '@/lib/tools'
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
  // Tool-related state
  enabledTools: string[]
  isExecutingTools: boolean
  pendingToolCalls: ToolCall[]
}

interface ChatActions {
  setActiveConversation: (id: string | null) => void
  createConversation: (title?: string, projectId?: string, modelId?: string, folderId?: string | null) => string
  deleteConversation: (id: string) => void
  updateConversationTitle: (id: string, title: string) => void
  updateConversationModel: (id: string, modelId: string) => void
  sendMessage: (input: SendMessageInput) => Promise<void>
  clearConversation: (id: string) => void
  loadConversations: () => void
  // Tool-related actions
  setEnabledTools: (toolNames: string[]) => void
  executeToolCalls: (toolCalls: ToolCall[]) => Promise<ToolExecutionRecord[]>
  // Folder & organization actions
  moveConversationToFolder: (conversationId: string, folderId: string | null, projectId?: string | null) => void
  moveConversationToProject: (conversationId: string, projectId: string | null) => void
  // Pinning actions
  toggleConversationPinned: (id: string) => void
  // Branching actions
  branchConversation: (sourceId: string, branchPointMessageId: string, title?: string) => string
  // Search
  searchConversations: (query: string, projectId?: string) => Conversation[]
}

type ChatStore = ChatState & { actions: ChatActions }

// Convert array to record
const conversationsRecord = mockConversations.reduce((acc, conv) => {
  acc[conv.id] = conv
  return acc
}, {} as Record<string, Conversation>)

export const useChatStore = create<ChatStore>()(
  devtools(
    (set, get) => ({
      conversations: conversationsRecord,
      activeConversationId: null,
      messagesByConversation: mockMessages,
      isStreaming: false,
      streamingMessage: '',
      isLoading: false,
      // Tool-related initial state
      enabledTools: [],
      isExecutingTools: false,
      pendingToolCalls: [],

      actions: {
        setActiveConversation: (id) => {
          set({ activeConversationId: id })
        },

        createConversation: (title = 'New conversation', projectId, modelId, folderId = null) => {
          const id = `conv-${generateId()}`
          const now = new Date()

          const conversation: Conversation = {
            id,
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

          set((state) => ({
            conversations: { ...state.conversations, [id]: conversation },
            messagesByConversation: { ...state.messagesByConversation, [id]: [] },
            activeConversationId: id,
          }))

          return id
        },

        deleteConversation: (id) => {
          set((state) => {
            const { [id]: _, ...conversations } = state.conversations
            const { [id]: __, ...messagesByConversation } = state.messagesByConversation

            return {
              conversations,
              messagesByConversation,
              activeConversationId:
                state.activeConversationId === id ? null : state.activeConversationId,
            }
          })
        },

        updateConversationTitle: (id, title) => {
          set((state) => ({
            conversations: {
              ...state.conversations,
              [id]: { ...state.conversations[id], title, updatedAt: new Date() },
            },
          }))
        },

        updateConversationModel: (id, modelId) => {
          set((state) => ({
            conversations: {
              ...state.conversations,
              [id]: { ...state.conversations[id], modelId, updatedAt: new Date() },
            },
          }))
        },

        sendMessage: async (input) => {
          const { activeConversationId, conversations, messagesByConversation, enabledTools, actions } = get()
          if (!activeConversationId) return

          const conversation = conversations[activeConversationId]
          const modelId = input.modelId || conversation.modelId || 'claude-sonnet-4-20250514'

          const userMessageId = `msg-${generateId()}`
          const now = new Date()

          // Add user message
          const userMessage: Message = {
            id: userMessageId,
            conversationId: activeConversationId,
            role: 'user',
            content: input.content,
            attachments: input.attachments?.map((a) => ({ ...a, id: generateId() })),
            createdAt: now,
          }

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

          // Start streaming
          set({ isStreaming: true, streamingMessage: '' })

          // Get conversation messages for API
          const existingMessages = messagesByConversation[activeConversationId] || []

          // Build messages including tool call/response messages, images, and files
          const buildApiMessages = (messages: Message[]) => {
            return messages.map((msg) => {
              // Extract image attachments
              const images = msg.attachments?.filter((a) => a.type === 'image') as import('@/types').ImageAttachment[] | undefined
              // Extract file attachments
              const files = msg.attachments?.filter((a) => a.type === 'file') as import('@/types').FileAttachment[] | undefined

              return {
                role: msg.role,
                content: msg.content,
                ...(msg.tool_calls && { tool_calls: msg.tool_calls }),
                ...(msg.tool_call_id && { tool_call_id: msg.tool_call_id }),
                ...(images && images.length > 0 && { images }),
                ...(files && files.length > 0 && { files }),
              }
            })
          }

          let apiMessages = buildApiMessages([...existingMessages, userMessage])

          // Determine provider from model ID
          let provider: AIProvider = 'anthropic'
          if (modelId.startsWith('gpt-')) provider = 'openai'
          else if (modelId.startsWith('glean-')) provider = 'glean'
          else if (modelId.startsWith('dust-')) provider = 'dust'
          else if (modelId.startsWith('ondobot-')) provider = 'ondobot'

          // Determine which tools to use
          const toolsToUse = input.tools || enabledTools
          const toolsConfig = toolsToUse.length > 0 ? toolRegistry.toAPIFormat(toolsToUse) : undefined

          // Get routing options from the routing store
          const routingState = useRoutingStore.getState()
          const routingOptions = routingState.actions.getRoutingOptions()

          // Recursive function to handle tool calls
          const processResponse = async () => {
            const aiMessageId = `msg-${generateId()}`
            let fullResponse = ''
            let receivedToolCalls: ToolCall[] = []
            let routingInfo: RoutingInfo | undefined

            try {
              await chatClient.stream(
                {
                  conversationId: activeConversationId,
                  messages: apiMessages,
                  provider,
                  model: modelId,
                  options: {
                    tools: toolsConfig,
                    tool_choice: input.tool_choice,
                  },
                },
                {
                  onStart: () => {
                    set({ streamingMessage: '' })
                  },
                  onDelta: (delta) => {
                    fullResponse += delta
                    set({ streamingMessage: fullResponse })
                  },
                  onRoutingInfo: (info) => {
                    routingInfo = info
                    // Update the routing store with the last routing info
                    useRoutingStore.getState().actions.setLastRouteInfo({
                      intent: info.intent,
                      confidence: info.confidence,
                      provider: provider,
                      wasAutoRouted: info.wasAutoRouted,
                    })
                  },
                  onDone: async (response) => {
                    // Check if response contains tool calls
                    if (response.message.tool_calls && response.message.tool_calls.length > 0) {
                      receivedToolCalls = response.message.tool_calls

                      // Add assistant message with tool calls
                      const assistantMessage: Message = {
                        id: aiMessageId,
                        conversationId: activeConversationId,
                        role: 'assistant',
                        content: response.message.content || '',
                        tool_calls: receivedToolCalls,
                        metadata: {
                          model: response.metadata.model,
                          tokenCount: response.usage.totalTokens,
                          processingTimeMs: response.metadata.processingTimeMs,
                          routing: routingInfo ? {
                            intent: routingInfo.intent,
                            confidence: routingInfo.confidence,
                            wasAutoRouted: routingInfo.wasAutoRouted,
                            routedBy: routingInfo.routedBy,
                          } : undefined,
                        },
                        createdAt: new Date(),
                      }

                      set((state) => ({
                        messagesByConversation: {
                          ...state.messagesByConversation,
                          [activeConversationId]: [
                            ...(state.messagesByConversation[activeConversationId] || []),
                            assistantMessage,
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

                      // Execute tool calls
                      const toolResults = await actions.executeToolCalls(receivedToolCalls)

                      // Add tool response messages
                      const toolMessages: Message[] = toolResults.map((result) => ({
                        id: `msg-${generateId()}`,
                        conversationId: activeConversationId,
                        role: 'tool' as const,
                        content: result.result.success ? result.result.output : (result.result.error || 'Tool execution failed'),
                        tool_call_id: result.id,
                        tool_executions: [result],
                        createdAt: new Date(),
                      }))

                      set((state) => ({
                        messagesByConversation: {
                          ...state.messagesByConversation,
                          [activeConversationId]: [
                            ...(state.messagesByConversation[activeConversationId] || []),
                            ...toolMessages,
                          ],
                        },
                        conversations: {
                          ...state.conversations,
                          [activeConversationId]: {
                            ...state.conversations[activeConversationId],
                            messageCount: state.conversations[activeConversationId].messageCount + toolMessages.length,
                            lastMessageAt: new Date(),
                            updatedAt: new Date(),
                          },
                        },
                      }))

                      // Update apiMessages with new messages and continue conversation
                      const updatedMessages = get().messagesByConversation[activeConversationId] || []
                      apiMessages = buildApiMessages(updatedMessages)

                      // Recursively process next response (to handle multi-turn tool use)
                      await processResponse()
                    } else {
                      // No tool calls, add final assistant message
                      const aiMessage: Message = {
                        id: aiMessageId,
                        conversationId: activeConversationId,
                        role: 'assistant',
                        content: response.message.content || fullResponse,
                        metadata: {
                          model: response.metadata.model,
                          tokenCount: response.usage.totalTokens,
                          processingTimeMs: response.metadata.processingTimeMs,
                          routing: routingInfo ? {
                            intent: routingInfo.intent,
                            confidence: routingInfo.confidence,
                            wasAutoRouted: routingInfo.wasAutoRouted,
                            routedBy: routingInfo.routedBy,
                          } : undefined,
                        },
                        createdAt: new Date(),
                      }

                      set((state) => ({
                        messagesByConversation: {
                          ...state.messagesByConversation,
                          [activeConversationId]: [
                            ...(state.messagesByConversation[activeConversationId] || []),
                            aiMessage,
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
                        isStreaming: false,
                        streamingMessage: '',
                      }))
                    }
                  },
                  onError: (error) => {
                    console.error('Chat error:', error)

                    // Add error message
                    const errorMessage: Message = {
                      id: aiMessageId,
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
                },
                {}, // StreamOptions (use defaults)
                routingOptions
              )
            } catch (error) {
              console.error('Chat error:', error)
              set({ isStreaming: false, streamingMessage: '' })
            }
          }

          await processResponse()
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

        loadConversations: () => {
          set({ isLoading: true })
          // Simulate API call
          setTimeout(() => {
            set({ isLoading: false })
          }, 500)
        },

        setEnabledTools: (toolNames: string[]) => {
          set({ enabledTools: toolNames })
        },

        executeToolCalls: async (toolCalls: ToolCall[]) => {
          set({ isExecutingTools: true, pendingToolCalls: toolCalls })

          const parsedCalls = toolCalls.map((tc) => ({
            id: tc.id,
            name: tc.function.name,
            arguments: JSON.parse(tc.function.arguments),
          }))

          const results = await toolRegistry.executeToolCalls(parsedCalls, { parallel: true })

          set({ isExecutingTools: false, pendingToolCalls: [] })
          return results
        },

        moveConversationToFolder: (conversationId, folderId, projectId) => {
          set((state) => {
            const conversation = state.conversations[conversationId]
            if (!conversation) return state

            return {
              conversations: {
                ...state.conversations,
                [conversationId]: {
                  ...conversation,
                  folderId,
                  projectId: projectId !== undefined ? projectId : conversation.projectId,
                  updatedAt: new Date(),
                },
              },
            }
          })
        },

        moveConversationToProject: (conversationId, projectId) => {
          set((state) => {
            const conversation = state.conversations[conversationId]
            if (!conversation) return state

            return {
              conversations: {
                ...state.conversations,
                [conversationId]: {
                  ...conversation,
                  projectId,
                  folderId: null, // Remove from folder when moving to different project
                  updatedAt: new Date(),
                },
              },
            }
          })
        },

        toggleConversationPinned: (id) => {
          set((state) => {
            const conversation = state.conversations[id]
            if (!conversation) return state

            return {
              conversations: {
                ...state.conversations,
                [id]: {
                  ...conversation,
                  pinned: !conversation.pinned,
                  updatedAt: new Date(),
                },
              },
            }
          })
        },

        branchConversation: (sourceId, branchPointMessageId, title) => {
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

          // Create new conversation
          const id = `conv-${generateId()}`
          const now = new Date()
          const branchTitle = title || `Branch of ${sourceConversation.title}`

          // Copy messages up to and including the branch point
          const copiedMessages = sourceMessages.slice(0, branchPointIndex + 1).map((msg) => ({
            ...msg,
            id: `msg-${generateId()}`,
            conversationId: id,
            createdAt: new Date(msg.createdAt),
          }))

          const newConversation: Conversation = {
            id,
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

          set((state) => ({
            conversations: { ...state.conversations, [id]: newConversation },
            messagesByConversation: { ...state.messagesByConversation, [id]: copiedMessages },
            activeConversationId: id,
          }))

          return id
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

import { useMemo } from 'react'
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { Conversation, Message, SendMessageInput, AIProvider, ToolCall, ToolExecutionRecord } from '@/types'
import { mockConversations, mockMessages } from '@/lib/mocks/data'
import { generateId } from '@/lib/utils'
import { chatClient } from '@/lib/api/client'
import { toolRegistry, registerBuiltinTools } from '@/lib/tools'

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
  createConversation: (title?: string, projectId?: string, modelId?: string) => string
  deleteConversation: (id: string) => void
  updateConversationTitle: (id: string, title: string) => void
  updateConversationModel: (id: string, modelId: string) => void
  sendMessage: (input: SendMessageInput) => Promise<void>
  clearConversation: (id: string) => void
  loadConversations: () => void
  // Tool-related actions
  setEnabledTools: (toolNames: string[]) => void
  executeToolCalls: (toolCalls: ToolCall[]) => Promise<ToolExecutionRecord[]>
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

        createConversation: (title = 'New conversation', projectId, modelId) => {
          const id = `conv-${generateId()}`
          const now = new Date()

          const conversation: Conversation = {
            id,
            title,
            projectId,
            modelId,
            userId: 'user-1',
            messageCount: 0,
            lastMessageAt: now,
            createdAt: now,
            updatedAt: now,
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

          // Recursive function to handle tool calls
          const processResponse = async () => {
            const aiMessageId = `msg-${generateId()}`
            let fullResponse = ''
            let receivedToolCalls: ToolCall[] = []

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
                }
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

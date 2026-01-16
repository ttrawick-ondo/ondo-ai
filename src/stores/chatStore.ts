import { useMemo } from 'react'
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { Conversation, Message, SendMessageInput } from '@/types'
import { mockConversations, mockMessages, mockAIResponses } from '@/lib/mocks/data'
import { generateId, sleep } from '@/lib/utils'

interface ChatState {
  conversations: Record<string, Conversation>
  activeConversationId: string | null
  messagesByConversation: Record<string, Message[]>
  isStreaming: boolean
  streamingMessage: string
  isLoading: boolean
}

interface ChatActions {
  setActiveConversation: (id: string | null) => void
  createConversation: (title?: string, projectId?: string) => string
  deleteConversation: (id: string) => void
  updateConversationTitle: (id: string, title: string) => void
  sendMessage: (input: SendMessageInput) => Promise<void>
  clearConversation: (id: string) => void
  loadConversations: () => void
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

      actions: {
        setActiveConversation: (id) => {
          set({ activeConversationId: id })
        },

        createConversation: (title = 'New conversation', projectId) => {
          const id = `conv-${generateId()}`
          const now = new Date()

          const conversation: Conversation = {
            id,
            title,
            projectId,
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

        sendMessage: async (input) => {
          const { activeConversationId, conversations } = get()
          if (!activeConversationId) return

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

          // Start streaming simulation
          set({ isStreaming: true, streamingMessage: '' })

          const aiMessageId = `msg-${generateId()}`
          let fullResponse = ''

          // Simulate streaming response
          for (const chunk of mockAIResponses) {
            await sleep(100 + Math.random() * 200)
            fullResponse += chunk
            set({ streamingMessage: fullResponse })
          }

          // Finalize AI message
          const aiMessage: Message = {
            id: aiMessageId,
            conversationId: activeConversationId,
            role: 'assistant',
            content: fullResponse,
            metadata: {
              model: 'claude-3-opus',
              tokenCount: Math.floor(fullResponse.length / 4),
              processingTimeMs: 1500 + Math.random() * 1000,
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

// Return actions directly from store - they're stable references
export const useChatActions = () => useChatStore.getState().actions

'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'
import { TypingIndicator } from './TypingIndicator'
import { BranchIndicator } from './BranchIndicator'
import { useMessages, useIsStreaming, useStreamingMessage, useChatActions, useChatStore } from '@/stores'

interface ChatContainerProps {
  conversationId: string
}

export function ChatContainer({ conversationId }: ChatContainerProps) {
  const router = useRouter()
  const messages = useMessages(conversationId)
  const isStreaming = useIsStreaming()
  const streamingMessage = useStreamingMessage()
  const conversation = useChatStore((s) => s.conversations[conversationId])
  const { branchConversation } = useChatActions()
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages or streaming
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, streamingMessage])

  // Handle branching from a message
  const handleBranch = useCallback(
    async (messageId: string) => {
      const newConversationId = await branchConversation(conversationId, messageId)
      router.push(`/chat/${newConversationId}`)
    },
    [branchConversation, conversationId, router]
  )

  const isBranch = !!conversation?.parentId

  return (
    <div className="flex h-full flex-col">
      {/* Branch indicator at top if this is a branched conversation */}
      {isBranch && <BranchIndicator conversationId={conversationId} />}

      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="mx-auto max-w-3xl px-4 py-6">
          <MessageList
            messages={messages}
            streamingMessage={isStreaming ? streamingMessage : undefined}
            onBranch={handleBranch}
          />
          {isStreaming && !streamingMessage && <TypingIndicator />}
        </div>
      </div>
      <div className="border-t bg-background p-4">
        <div className="mx-auto max-w-3xl">
          <ChatInput conversationId={conversationId} />
        </div>
      </div>
    </div>
  )
}

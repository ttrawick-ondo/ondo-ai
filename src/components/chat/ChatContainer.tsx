'use client'

import { useEffect, useRef } from 'react'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'
import { TypingIndicator } from './TypingIndicator'
import { useMessages, useIsStreaming, useStreamingMessage } from '@/stores'

interface ChatContainerProps {
  conversationId: string
}

export function ChatContainer({ conversationId }: ChatContainerProps) {
  const messages = useMessages(conversationId)
  const isStreaming = useIsStreaming()
  const streamingMessage = useStreamingMessage()
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages or streaming
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, streamingMessage])

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="mx-auto max-w-3xl px-4 py-6">
          <MessageList
            messages={messages}
            streamingMessage={isStreaming ? streamingMessage : undefined}
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

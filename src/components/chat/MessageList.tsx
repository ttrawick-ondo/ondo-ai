'use client'

import { MessageBubble } from './MessageBubble'
import type { Message } from '@/types'

interface MessageListProps {
  messages: Message[]
  streamingMessage?: string
}

export function MessageList({ messages, streamingMessage }: MessageListProps) {
  if (messages.length === 0 && !streamingMessage) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Start the conversation by typing a message below.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      {streamingMessage && (
        <MessageBubble
          message={{
            id: 'streaming',
            conversationId: '',
            role: 'assistant',
            content: streamingMessage,
            createdAt: new Date(),
          }}
          isStreaming
        />
      )}
    </div>
  )
}

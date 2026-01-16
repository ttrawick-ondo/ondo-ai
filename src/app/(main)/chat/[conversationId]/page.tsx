'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChatContainer } from '@/components/chat'
import { useChatStore, useChatActions } from '@/stores'

export default function ConversationPage() {
  const params = useParams()
  const router = useRouter()
  const conversationId = params.conversationId as string

  // Use a stable selector that only returns whether the conversation exists
  const conversationExists = useChatStore((s) => !!s.conversations[conversationId])
  const { setActiveConversation } = useChatActions()

  // Set active conversation on mount
  useEffect(() => {
    if (conversationId && conversationExists) {
      setActiveConversation(conversationId)
    } else if (conversationId && !conversationExists) {
      router.push('/chat')
    }
  }, [conversationId, conversationExists, setActiveConversation, router])

  if (!conversationExists) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Loading conversation...</p>
      </div>
    )
  }

  return <ChatContainer conversationId={conversationId} />
}

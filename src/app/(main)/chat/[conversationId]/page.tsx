'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChatContainer } from '@/components/chat'
import { useChatStore, useChatActions, useChatLoading } from '@/stores'

export default function ConversationPage() {
  const params = useParams()
  const router = useRouter()
  const conversationId = params.conversationId as string

  // Use stable selectors
  const conversationExists = useChatStore((s) => !!s.conversations[conversationId])
  const messagesLoaded = useChatStore((s) => (s.messagesByConversation[conversationId]?.length ?? 0) > 0)
  const isLoading = useChatLoading()
  const { setActiveConversation, loadConversationMessages } = useChatActions()

  // Set active conversation and load messages on mount
  useEffect(() => {
    if (conversationId && conversationExists) {
      setActiveConversation(conversationId)
      // Load messages from database if not already loaded
      loadConversationMessages(conversationId)
    } else if (conversationId && !conversationExists) {
      router.push('/chat')
    }
  }, [conversationId, conversationExists, setActiveConversation, loadConversationMessages, router])

  if (!conversationExists) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Loading conversation...</p>
      </div>
    )
  }

  // Show loading state while messages are being fetched from database
  if (isLoading && !messagesLoaded) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Loading messages...</p>
      </div>
    )
  }

  return <ChatContainer conversationId={conversationId} />
}

'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChatContainer } from '@/components/chat'
import { useChatStore, useChatActions, useChatLoading, useConversationsInitialized } from '@/stores'
import { conversationApi } from '@/lib/api/client/conversations'

export default function ConversationPage() {
  const params = useParams()
  const router = useRouter()
  const conversationId = params.conversationId as string
  const [fetchError, setFetchError] = useState(false)
  const [isFetchingConversation, setIsFetchingConversation] = useState(false)

  // Use stable selectors
  const conversationExists = useChatStore((s) => !!s.conversations[conversationId])
  const messagesLoaded = useChatStore((s) => (s.messagesByConversation[conversationId]?.length ?? 0) > 0)
  const isLoading = useChatLoading()
  const isInitialized = useConversationsInitialized()
  const { setActiveConversation, loadConversationMessages, loadConversations } = useChatActions()

  // Fetch the specific conversation if store is initialized but conversation is missing
  useEffect(() => {
    async function fetchConversation() {
      if (!conversationId || conversationExists || !isInitialized || isFetchingConversation || fetchError) {
        return
      }

      setIsFetchingConversation(true)
      try {
        const conversation = await conversationApi.getConversation(conversationId)
        if (conversation) {
          // Add to store
          const currentConversations = useChatStore.getState().conversations
          loadConversations([...Object.values(currentConversations), conversation])
        }
      } catch (error) {
        console.error('Failed to fetch conversation:', error)
        setFetchError(true)
      } finally {
        setIsFetchingConversation(false)
      }
    }

    fetchConversation()
  }, [conversationId, conversationExists, isInitialized, isFetchingConversation, fetchError, loadConversations])

  // Set active conversation and load messages once conversation exists
  useEffect(() => {
    if (conversationId && conversationExists) {
      setActiveConversation(conversationId)
      loadConversationMessages(conversationId)
    }
  }, [conversationId, conversationExists, setActiveConversation, loadConversationMessages])

  // Redirect only after we've confirmed the conversation doesn't exist
  useEffect(() => {
    if (fetchError) {
      router.push('/chat')
    }
  }, [fetchError, router])

  // Show loading while store is initializing or we're fetching the conversation
  if (!isInitialized || isFetchingConversation) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Loading conversation...</p>
      </div>
    )
  }

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

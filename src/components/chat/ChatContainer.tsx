'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'
import { TypingIndicator } from './TypingIndicator'
import { BranchIndicator } from './BranchIndicator'
import { BranchTabs } from './BranchTabs'
import {
  useMessages,
  useIsStreaming,
  useStreamingMessage,
  useStreamingThinking,
  useChatActions,
  useChatStore,
  useConversationBranches,
} from '@/stores'

interface ChatContainerProps {
  conversationId: string
  initialBranchId?: string | null
}

export function ChatContainer({ conversationId, initialBranchId = null }: ChatContainerProps) {
  // State to track which branch tab is active (null = main conversation)
  const [activeBranchId, setActiveBranchId] = useState<string | null>(initialBranchId)

  // Sync with URL when clicking different branches in the sidebar
  useEffect(() => {
    setActiveBranchId(initialBranchId)
  }, [initialBranchId])

  // Get the main conversation and its branches
  const mainConversation = useChatStore((s) => s.conversations[conversationId])
  const branches = useConversationBranches(conversationId)

  // Determine which conversation to display (main or branch)
  const displayConversationId = activeBranchId ?? conversationId
  const displayConversation = useChatStore((s) => s.conversations[displayConversationId])

  // Also load sub-branches if the displayed conversation itself is a branch
  const subBranches = useConversationBranches(displayConversationId)

  // Get messages for the displayed conversation
  const messages = useMessages(displayConversationId)
  const isStreaming = useIsStreaming()
  const streamingMessage = useStreamingMessage()
  const streamingThinking = useStreamingThinking()
  const { branchConversation, deleteConversation, loadConversationMessages } = useChatActions()
  const scrollRef = useRef<HTMLDivElement>(null)

  // Load messages for active branch when switching tabs
  useEffect(() => {
    if (activeBranchId) {
      loadConversationMessages(activeBranchId)
    }
  }, [activeBranchId, loadConversationMessages])

  // Auto-scroll to bottom on new messages or streaming
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, streamingMessage, streamingThinking])

  // Scroll to bottom when input area resizes (textarea grows)
  const handleInputHeightChange = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [])

  // Handle branching from a message - switch to new branch tab instead of navigating
  const handleBranch = useCallback(
    async (messageId: string) => {
      // Branch from the currently displayed conversation
      const newBranchId = await branchConversation(displayConversationId, messageId)
      setActiveBranchId(newBranchId)
    },
    [branchConversation, displayConversationId]
  )

  // Handle creating a branch from the last message in the main conversation
  const handleCreateBranchFromLast = useCallback(async () => {
    if (messages.length === 0) return
    const lastMessage = messages[messages.length - 1]
    const newBranchId = await branchConversation(conversationId, lastMessage.id)
    setActiveBranchId(newBranchId)
  }, [branchConversation, conversationId, messages])

  // Handle deleting a branch from tab close button
  const handleDeleteBranch = useCallback(async (branchId: string) => {
    if (activeBranchId === branchId) {
      setActiveBranchId(null)
    }
    await deleteConversation(branchId)
  }, [activeBranchId, deleteConversation])

  // Check if the displayed conversation is a branch (has a parentId)
  const isBranchView = !!displayConversation?.parentId

  // Show tabs if there are branches or we're viewing a branch
  const showTabs = branches.length > 0 || activeBranchId !== null

  return (
    <div className="flex h-full flex-col">
      {/* Branch tabs when there are branches */}
      {showTabs && mainConversation && (
        <BranchTabs
          mainConversationId={conversationId}
          mainTitle={mainConversation.title}
          branches={branches}
          activeBranchId={activeBranchId}
          onBranchSelect={setActiveBranchId}
          onDeleteBranch={handleDeleteBranch}
          onCreateBranch={messages.length > 0 ? handleCreateBranchFromLast : undefined}
        />
      )}

      {/* Branch context indicator when viewing a branch */}
      {isBranchView && activeBranchId && (
        <BranchIndicator conversationId={activeBranchId} inline />
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="mx-auto max-w-4xl px-4 pt-4 pb-6">
          <MessageList
            messages={messages}
            streamingMessage={isStreaming ? streamingMessage : undefined}
            streamingThinking={isStreaming ? streamingThinking : undefined}
            onBranch={handleBranch}
          />
          {isStreaming && !streamingMessage && !streamingThinking && <TypingIndicator />}
        </div>
      </div>
      <div className="shrink-0 mx-auto w-full max-w-4xl px-4">
        <ChatInput conversationId={displayConversationId} onHeightChange={handleInputHeightChange} />
      </div>
    </div>
  )
}

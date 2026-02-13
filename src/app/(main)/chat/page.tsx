'use client'

import { useRouter } from 'next/navigation'
import { MessageSquarePlus, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useChatActions, useActiveWorkspaceId } from '@/stores'

export default function ChatPage() {
  const router = useRouter()
  const { createConversation, setActiveConversation } = useChatActions()
  const activeWorkspaceId = useActiveWorkspaceId()

  const handleNewChat = async () => {
    const id = await createConversation(undefined, undefined, undefined, null, activeWorkspaceId)
    setActiveConversation(id)
    router.push(`/chat/${id}`)
  }

  return (
    <div className="flex h-full flex-col items-center justify-center p-8">
      <div className="flex flex-col items-center gap-6 text-center max-w-md">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold mb-2">Welcome to Ondo AI</h1>
          <p className="text-muted-foreground">
            Your intelligent assistant for coding, writing, analysis, and more.
            Start a new conversation to get help with any task.
          </p>
        </div>
        <Button size="lg" onClick={handleNewChat}>
          <MessageSquarePlus className="h-5 w-5 mr-2" />
          Start New Chat
        </Button>
        <div className="grid grid-cols-2 gap-4 w-full mt-4">
          <SuggestionCard
            title="Write code"
            description="Get help with coding tasks"
            onClick={handleNewChat}
          />
          <SuggestionCard
            title="Analyze data"
            description="Understand your data better"
            onClick={handleNewChat}
          />
          <SuggestionCard
            title="Draft content"
            description="Write emails, docs, and more"
            onClick={handleNewChat}
          />
          <SuggestionCard
            title="Brainstorm ideas"
            description="Generate creative solutions"
            onClick={handleNewChat}
          />
        </div>
      </div>
    </div>
  )
}

function SuggestionCard({
  title,
  description,
  onClick,
}: {
  title: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-start gap-1 rounded-lg border p-4 text-left transition-colors hover:bg-muted"
    >
      <span className="font-medium text-sm">{title}</span>
      <span className="text-xs text-muted-foreground">{description}</span>
    </button>
  )
}

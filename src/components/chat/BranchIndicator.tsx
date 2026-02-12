'use client'

import { useRouter } from 'next/navigation'
import { GitBranch, ExternalLink, Quote } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useParentConversation, useChatStore } from '@/stores'

interface BranchIndicatorProps {
  conversationId: string
  className?: string
  /** When true, shows context without navigation link (for use within tabs) */
  inline?: boolean
}

function truncateText(text: string, maxLength = 60): string {
  // Clean up the text - remove newlines and extra whitespace
  const cleaned = text.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim()
  if (cleaned.length <= maxLength) return cleaned
  return cleaned.slice(0, maxLength - 1) + '…'
}

export function BranchIndicator({ conversationId, className, inline = false }: BranchIndicatorProps) {
  const router = useRouter()
  const parentConversation = useParentConversation(conversationId)

  // Get the branch conversation to find the branchPointId
  const branchConversation = useChatStore((s) => s.conversations[conversationId])
  const branchPointId = branchConversation?.branchPointId

  // Get the branch point message from the parent conversation
  const branchPointMessage = useChatStore((s) => {
    if (!parentConversation || !branchPointId) return null
    const parentMessages = s.messagesByConversation[parentConversation.id] || []
    return parentMessages.find((m) => m.id === branchPointId) || null
  })

  if (!parentConversation) {
    return null
  }

  const handleNavigateToParent = () => {
    router.push(`/chat/${parentConversation.id}`)
  }

  // Inline mode: compact display with branch point context, no navigation
  if (inline) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 px-4 py-1.5 bg-muted/30 border-b text-xs',
          className
        )}
      >
        <Quote className="h-3 w-3 text-muted-foreground flex-shrink-0" />
        <span className="text-muted-foreground">
          Branched from:{' '}
          <span className="text-foreground/80 italic">
            &ldquo;{branchPointMessage ? truncateText(branchPointMessage.content) : parentConversation.title}&rdquo;
          </span>
        </span>
      </div>
    )
  }

  // Full mode: shows link to navigate to parent
  return (
    <div
      className={cn(
        'flex items-center gap-2 px-4 py-2 bg-muted/50 border-b text-sm',
        className
      )}
    >
      <GitBranch className="h-4 w-4 text-muted-foreground" />
      <span className="text-muted-foreground">Branched from</span>
      <Button
        variant="link"
        className="h-auto p-0 text-sm font-medium"
        onClick={handleNavigateToParent}
      >
        {parentConversation.title}
        <ExternalLink className="h-3 w-3 ml-1" />
      </Button>
      {branchPointMessage && (
        <span className="text-muted-foreground text-xs ml-2 hidden sm:inline">
          (&ldquo;{truncateText(branchPointMessage.content, 40)}&rdquo;)
        </span>
      )}
    </div>
  )
}

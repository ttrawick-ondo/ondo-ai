'use client'

import { useRouter } from 'next/navigation'
import { GitBranch, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useParentConversation } from '@/stores'

interface BranchIndicatorProps {
  conversationId: string
  className?: string
}

export function BranchIndicator({ conversationId, className }: BranchIndicatorProps) {
  const router = useRouter()
  const parentConversation = useParentConversation(conversationId)

  if (!parentConversation) {
    return null
  }

  const handleNavigateToParent = () => {
    router.push(`/chat/${parentConversation.id}`)
  }

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
    </div>
  )
}

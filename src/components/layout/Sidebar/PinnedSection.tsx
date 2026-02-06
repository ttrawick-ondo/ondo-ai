'use client'

import { useState } from 'react'
import { Pin, ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ConversationItem } from '@/components/folders'
import type { Conversation } from '@/types'

interface PinnedSectionProps {
  conversations: Conversation[]
  selectedConversationId?: string | null
  focusedConversationId?: string | null
  onSelectConversation: (id: string) => void
  onEditConversation?: (id: string) => void
  onDeleteConversation?: (id: string) => void
  onPinConversation?: (id: string) => void
  onMoveConversation?: (id: string) => void
  defaultExpanded?: boolean
}

export function PinnedSection({
  conversations,
  selectedConversationId,
  focusedConversationId,
  onSelectConversation,
  onEditConversation,
  onDeleteConversation,
  onPinConversation,
  onMoveConversation,
  defaultExpanded = true,
}: PinnedSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  if (conversations.length === 0) {
    return null
  }

  return (
    <div className="py-1">
      <Button
        variant="ghost"
        className="w-full justify-start gap-2 px-2 py-1.5 h-auto font-medium text-muted-foreground hover:text-foreground"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
        <Pin className="h-4 w-4 text-amber-500" />
        <span className="text-sm">Pinned</span>
        <span className="text-xs text-muted-foreground ml-auto">
          {conversations.length}
        </span>
      </Button>

      {isExpanded && (
        <div className="flex flex-col gap-0.5 mt-1">
          {conversations.map((conv) => (
            <ConversationItem
              key={conv.id}
              conversation={conv}
              depth={0}
              isSelected={conv.id === selectedConversationId}
              isFocused={conv.id === focusedConversationId}
              onSelect={() => onSelectConversation(conv.id)}
              onEdit={onEditConversation ? () => onEditConversation(conv.id) : undefined}
              onDelete={onDeleteConversation ? () => onDeleteConversation(conv.id) : undefined}
              onPin={onPinConversation ? () => onPinConversation(conv.id) : undefined}
              onMove={onMoveConversation ? () => onMoveConversation(conv.id) : undefined}
              showTime={false}
            />
          ))}
        </div>
      )}
    </div>
  )
}

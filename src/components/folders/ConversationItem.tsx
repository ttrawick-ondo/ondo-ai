'use client'

import { useState } from 'react'
import {
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Trash2,
  Pin,
  PinOff,
  MoveRight,
  GitBranch,
} from 'lucide-react'
import { useDraggable } from '@dnd-kit/core'
import { cn, formatRelativeTime } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Conversation } from '@/types'

interface ConversationItemProps {
  conversation: Conversation
  depth?: number
  isSelected?: boolean
  onSelect: () => void
  onEdit?: () => void
  onDelete?: () => void
  onPin?: () => void
  onMove?: () => void
  showBranchIndicator?: boolean
  showTime?: boolean
  enableDragDrop?: boolean
}

export function ConversationItem({
  conversation,
  depth = 0,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onPin,
  onMove,
  showBranchIndicator = true,
  showTime = true,
  enableDragDrop = false,
}: ConversationItemProps) {
  const [isHovered, setIsHovered] = useState(false)
  const isBranch = !!conversation.parentId

  // Drag hook
  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging,
  } = useDraggable({
    id: `conversation-${conversation.id}`,
    data: {
      type: 'conversation' as const,
      item: conversation,
    },
    disabled: !enableDragDrop,
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer transition-colors',
        isSelected
          ? 'bg-secondary text-secondary-foreground'
          : 'hover:bg-muted text-muted-foreground hover:text-foreground',
        isDragging && 'opacity-50'
      )}
      style={{ paddingLeft: `${(depth + 1) * 12 + 16}px` }}
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...(enableDragDrop ? attributes : {})}
      {...(enableDragDrop ? listeners : {})}
    >
      {/* Branch indicator or message icon */}
      <div className="shrink-0 flex items-center gap-1">
        {isBranch && showBranchIndicator ? (
          <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <MessageSquare className="h-4 w-4" />
        )}
        {conversation.pinned && (
          <Pin className="h-3 w-3 text-amber-500" />
        )}
      </div>

      {/* Title and time */}
      <div className="flex-1 min-w-0">
        <div className="truncate font-medium">{conversation.title}</div>
        {showTime && (
          <div className="text-xs text-muted-foreground">
            {formatRelativeTime(conversation.lastMessageAt)}
          </div>
        )}
      </div>

      {/* Actions dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-6 w-6 shrink-0 transition-opacity',
              isHovered ? 'opacity-100' : 'opacity-0'
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {onPin && (
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onPin() }}>
              {conversation.pinned ? (
                <>
                  <PinOff className="h-4 w-4 mr-2" />
                  Unpin
                </>
              ) : (
                <>
                  <Pin className="h-4 w-4 mr-2" />
                  Pin
                </>
              )}
            </DropdownMenuItem>
          )}
          {onEdit && (
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit() }}>
              <Pencil className="h-4 w-4 mr-2" />
              Rename
            </DropdownMenuItem>
          )}
          {onMove && (
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onMove() }}>
              <MoveRight className="h-4 w-4 mr-2" />
              Move
            </DropdownMenuItem>
          )}
          {onDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={(e) => { e.stopPropagation(); onDelete() }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

'use client'

import { useState, useRef, useEffect } from 'react'
import {
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Trash2,
  Pin,
  PinOff,
  MoveRight,
  GitBranch,
  ChevronRight,
  ChevronDown,
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
  isFocused?: boolean
  onSelect: () => void
  onRename?: (id: string, newTitle: string) => void
  onDelete?: () => void
  onPin?: () => void
  onMove?: () => void
  showBranchIndicator?: boolean
  showTime?: boolean
  enableDragDrop?: boolean
  branches?: Conversation[]
  selectedConversationId?: string | null
  onSelectConversation?: (id: string) => void
  onRenameConversation?: (id: string, newTitle: string) => void
  onDeleteConversation?: (id: string) => void
  onPinConversation?: (id: string) => void
  onMoveConversation?: (id: string) => void
}

export function ConversationItem({
  conversation,
  depth = 0,
  isSelected,
  isFocused,
  onSelect,
  onRename,
  onDelete,
  onPin,
  onMove,
  showBranchIndicator = true,
  showTime = true,
  enableDragDrop = false,
  branches,
  selectedConversationId,
  onSelectConversation,
  onRenameConversation,
  onDeleteConversation,
  onPinConversation,
  onMoveConversation,
}: ConversationItemProps) {
  const [isBranchesExpanded, setIsBranchesExpanded] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(conversation.title)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleStartEdit = () => {
    setEditTitle(conversation.title)
    setIsEditing(true)
  }

  const handleConfirmEdit = () => {
    const trimmed = editTitle.trim()
    if (trimmed && trimmed !== conversation.title) {
      onRename?.(conversation.id, trimmed)
    }
    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    setEditTitle(conversation.title)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleConfirmEdit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancelEdit()
    }
  }

  const isBranch = !!conversation.parentId
  const hasBranches = branches && branches.length > 0

  // Auto-expand branches if a branch is selected
  useEffect(() => {
    if (hasBranches && selectedConversationId && branches!.some(b => b.id === selectedConversationId)) {
      setIsBranchesExpanded(true)
    }
  }, [hasBranches, branches, selectedConversationId])

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
    <>
      <div
        ref={setNodeRef}
        className={cn(
          'group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer transition-colors',
          isSelected
            ? 'bg-secondary text-secondary-foreground'
            : 'hover:bg-muted text-muted-foreground hover:text-foreground',
          isFocused && !isSelected && 'ring-1 ring-primary/50 bg-muted/50',
          isDragging && 'opacity-50'
        )}
        onClick={onSelect}
        title={showTime ? `${conversation.title} — ${formatRelativeTime(conversation.lastMessageAt)}` : conversation.title}
        {...(enableDragDrop ? attributes : {})}
        {...(enableDragDrop ? listeners : {})}
      >
        {/* Icon */}
        <div className="shrink-0">
          {isBranch && showBranchIndicator ? (
            <GitBranch className="h-3.5 w-3.5" />
          ) : (
            <MessageSquare className="h-3.5 w-3.5" />
          )}
        </div>

        {/* Title — single line */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleConfirmEdit}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
              className="w-full bg-background border border-input rounded px-1.5 py-0.5 text-sm outline-none focus:ring-1 focus:ring-primary"
            />
          ) : (
            <span className="truncate block leading-snug">
              {conversation.pinned && (
                <Pin className="h-2.5 w-2.5 text-amber-500 inline mr-1 -mt-0.5" />
              )}
              {conversation.title}
            </span>
          )}
        </div>

        {/* Right side: branch badge + hover menu */}
        <div className="shrink-0 flex items-center gap-1">
          {/* Branch count badge */}
          {hasBranches && (
            <button
              className="flex items-center gap-0.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              onClick={(e) => {
                e.stopPropagation()
                setIsBranchesExpanded(!isBranchesExpanded)
              }}
              title={isBranchesExpanded ? 'Collapse branches' : 'Expand branches'}
            >
              <GitBranch className="h-3 w-3" />
              <span className="tabular-nums">{branches!.length}</span>
              {isBranchesExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </button>
          )}

          {/* Actions — hover only */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity',
                  isSelected && 'opacity-70'
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-3 w-3" />
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
              {onRename && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStartEdit() }}>
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
      </div>

      {/* Expanded branches — indented with left border */}
      {hasBranches && isBranchesExpanded && (
        <div className="ml-3 pl-2 border-l border-border/40 flex flex-col gap-0.5">
          {branches!.map((branch) => (
            <ConversationItem
              key={branch.id}
              conversation={branch}
              depth={depth + 1}
              isSelected={branch.id === selectedConversationId}
              onSelect={() => { onSelectConversation?.(branch.id) }}
              onRename={onRenameConversation}
              onDelete={onDeleteConversation ? () => onDeleteConversation(branch.id) : undefined}
              onPin={onPinConversation ? () => onPinConversation(branch.id) : undefined}
              onMove={onMoveConversation ? () => onMoveConversation(branch.id) : undefined}
              enableDragDrop={enableDragDrop}
            />
          ))}
        </div>
      )}
    </>
  )
}

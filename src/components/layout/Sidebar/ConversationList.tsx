'use client'

import { useRouter } from 'next/navigation'
import { MessageSquare, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { cn, formatRelativeTime } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useConversations, useChatStore, useChatActions } from '@/stores'

export function ConversationList() {
  const router = useRouter()
  const conversations = useConversations()
  const activeConversationId = useChatStore((s) => s.activeConversationId)
  const { setActiveConversation, deleteConversation } = useChatActions()

  // Sort by lastMessageAt descending
  const sortedConversations = [...conversations].sort(
    (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
  )

  const handleSelect = (id: string) => {
    setActiveConversation(id)
    router.push(`/chat/${id}`)
  }

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    deleteConversation(id)
    if (activeConversationId === id) {
      router.push('/chat')
    }
  }

  if (conversations.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        No conversations yet.
        <br />
        Start a new chat!
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-0.5 p-2">
      <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
        Recent Conversations
      </div>
      {sortedConversations.map((conversation) => {
        const isActive = conversation.id === activeConversationId
        return (
          <div
            key={conversation.id}
            className={cn(
              'group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer transition-colors',
              isActive
                ? 'bg-secondary text-secondary-foreground'
                : 'hover:bg-muted text-muted-foreground hover:text-foreground'
            )}
            onClick={() => handleSelect(conversation.id)}
          >
            <MessageSquare className="h-4 w-4 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="truncate font-medium">{conversation.title}</div>
              <div className="text-xs text-muted-foreground">
                {formatRelativeTime(conversation.lastMessageAt)}
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Pencil className="h-4 w-4 mr-2" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={(e) => handleDelete(e, conversation.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      })}
    </div>
  )
}

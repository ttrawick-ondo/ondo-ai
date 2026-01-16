'use client'

import { Bot } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

export function TypingIndicator() {
  return (
    <div className="flex gap-4">
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback className="bg-primary text-primary-foreground">
          <Bot className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-muted px-4 py-3">
        <span className="typing-dot h-2 w-2 rounded-full bg-muted-foreground/60" />
        <span className="typing-dot h-2 w-2 rounded-full bg-muted-foreground/60" />
        <span className="typing-dot h-2 w-2 rounded-full bg-muted-foreground/60" />
      </div>
    </div>
  )
}

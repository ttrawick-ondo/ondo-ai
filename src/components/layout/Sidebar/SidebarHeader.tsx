'use client'

import { useRouter } from 'next/navigation'
import { Plus, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { useChatActions } from '@/stores'

export function SidebarHeader() {
  const router = useRouter()
  const { createConversation, setActiveConversation } = useChatActions()

  const handleNewChat = async () => {
    const id = await createConversation()
    setActiveConversation(id)
    router.push(`/chat/${id}`)
  }

  return (
    <div className="flex items-center justify-between p-4">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Sparkles className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="font-semibold">Ondo AI</span>
      </div>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNewChat}
              className="h-8 w-8"
            >
              <Plus className="h-4 w-4" />
              <span className="sr-only">New chat</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">New chat</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}

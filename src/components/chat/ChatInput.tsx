'use client'

import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { Send, Paperclip, Library, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { ModelSelector } from '@/components/model'
import { useChatActions, useIsStreaming, useUserPreferences, useChatStore, useActiveWorkspace } from '@/stores'

interface ChatInputProps {
  conversationId: string
}

export function ChatInput({ conversationId }: ChatInputProps) {
  const [message, setMessage] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { sendMessage, updateConversationModel } = useChatActions()
  const isStreaming = useIsStreaming()
  const preferences = useUserPreferences()
  const conversation = useChatStore((state) => state.conversations[conversationId])
  const workspace = useActiveWorkspace()

  const selectedModelId = conversation?.modelId || preferences.defaultModelId || 'claude-3-5-sonnet-20241022'

  const handleModelSelect = (modelId: string) => {
    updateConversationModel(conversationId, modelId)
  }

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [message])

  const handleSubmit = async () => {
    if (!message.trim() || isStreaming) return

    const content = message.trim()
    setMessage('')
    await sendMessage({ content, modelId: selectedModelId })
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && preferences.sendWithEnter) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="relative">
      <div className="flex items-end gap-2 rounded-2xl border bg-background p-2 shadow-sm focus-within:ring-1 focus-within:ring-ring">
        <ModelSelector
          selectedModelId={selectedModelId}
          onModelSelect={handleModelSelect}
          workspaceId={workspace?.id}
          compact
          disabled={isStreaming}
        />

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0"
                disabled={isStreaming}
              >
                <Paperclip className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Attach file</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0"
                disabled={isStreaming}
              >
                <Library className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Use prompt template</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          disabled={isStreaming}
          className={cn(
            'min-h-[40px] max-h-[200px] flex-1 resize-none border-0 bg-transparent px-2 py-2 text-sm focus-visible:ring-0 focus-visible:ring-offset-0',
            isStreaming && 'opacity-50'
          )}
          rows={1}
        />

        <Button
          size="icon"
          className="h-9 w-9 shrink-0 rounded-xl"
          onClick={handleSubmit}
          disabled={!message.trim() || isStreaming}
        >
          {isStreaming ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>

      <p className="mt-2 text-center text-xs text-muted-foreground">
        {preferences.sendWithEnter ? (
          <>
            Press <kbd className="rounded border px-1">Enter</kbd> to send,{' '}
            <kbd className="rounded border px-1">Shift + Enter</kbd> for new line
          </>
        ) : (
          <>
            Press <kbd className="rounded border px-1">⌘ + Enter</kbd> to send
          </>
        )}
      </p>
    </div>
  )
}

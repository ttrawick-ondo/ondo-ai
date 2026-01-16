'use client'

import { useState } from 'react'
import { Copy, Check, User, Bot, RotateCcw, Wrench } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { MarkdownRenderer } from './MarkdownRenderer'
import { ToolCallDisplay, ToolResultDisplay } from './ToolCallDisplay'
import { ContentWithCitations } from './CitedContent'
import { FilePreviewList } from './FilePreview'
import { ReadAloudButton } from './AudioPlayer'
import { ModelBadge } from '@/components/model'
import type { Message, AIProvider, ImageAttachment, FileAttachment } from '@/types'
import { isFileAttachment } from '@/types'
import { useCurrentUser, useModels, useIsExecutingTools } from '@/stores'

interface MessageBubbleProps {
  message: Message
  isStreaming?: boolean
}

export function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false)
  const user = useCurrentUser()
  const models = useModels()
  const isExecutingTools = useIsExecutingTools()
  const isUser = message.role === 'user'
  const isTool = message.role === 'tool'
  const hasToolCalls = message.tool_calls && message.tool_calls.length > 0
  const imageAttachments = message.attachments?.filter((a): a is ImageAttachment => a.type === 'image') || []
  const fileAttachments = message.attachments?.filter((a): a is FileAttachment => isFileAttachment(a)) || []

  // Get model info for the badge
  const modelId = message.metadata?.model
  const model = modelId ? models.find((m) => m.id === modelId) : null

  // Determine provider from model ID if model config not found
  const getProviderFromModelId = (id: string): AIProvider => {
    if (id.startsWith('gpt-')) return 'openai'
    if (id.startsWith('claude-')) return 'anthropic'
    if (id.startsWith('glean-')) return 'glean'
    if (id.startsWith('dust-')) return 'dust'
    if (id.startsWith('ondobot-')) return 'ondobot'
    return 'anthropic'
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Tool result messages are rendered inline with less prominence
  if (isTool) {
    const execution = message.tool_executions?.[0]
    return (
      <div className="flex gap-4 pl-12">
        <div className="flex-1 max-w-[85%]">
          <ToolResultDisplay
            toolCallId={message.tool_call_id || ''}
            execution={execution}
          />
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'group flex gap-4',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      <Avatar className="h-8 w-8 shrink-0">
        {isUser ? (
          <>
            <AvatarImage src={user?.avatarUrl} />
            <AvatarFallback>
              <User className="h-4 w-4" />
            </AvatarFallback>
          </>
        ) : (
          <AvatarFallback className="bg-primary text-primary-foreground">
            <Bot className="h-4 w-4" />
          </AvatarFallback>
        )}
      </Avatar>

      <div
        className={cn(
          'flex flex-col gap-1 max-w-[85%]',
          isUser ? 'items-end' : 'items-start'
        )}
      >
        <div
          className={cn(
            'rounded-2xl px-4 py-2.5',
            isUser
              ? 'bg-primary text-primary-foreground rounded-br-md'
              : 'bg-muted rounded-bl-md'
          )}
        >
          {isUser ? (
            <>
              {imageAttachments.length > 0 && (
                <div className={cn(
                  'grid gap-2 mb-2',
                  imageAttachments.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
                )}>
                  {imageAttachments.map((img) => (
                    <img
                      key={img.id}
                      src={img.url}
                      alt={img.name}
                      className="rounded-lg max-w-[250px] max-h-[250px] object-cover"
                    />
                  ))}
                </div>
              )}
              {fileAttachments.length > 0 && (
                <div className="mb-2">
                  <FilePreviewList files={fileAttachments} showContent />
                </div>
              )}
              {message.content && (
                <p className="whitespace-pre-wrap text-sm">{message.content}</p>
              )}
            </>
          ) : (
            <>
              {message.content && (
                message.citations && message.citations.length > 0 ? (
                  <ContentWithCitations
                    content={message.content}
                    citations={message.citations}
                  />
                ) : (
                  <MarkdownRenderer content={message.content} />
                )
              )}
              {hasToolCalls && (
                <ToolCallDisplay
                  toolCalls={message.tool_calls!}
                  executions={message.tool_executions}
                  isExecuting={isExecutingTools}
                />
              )}
            </>
          )}
          {isStreaming && (
            <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse" />
          )}
        </div>

        {/* Model Badge for assistant messages */}
        {!isUser && modelId && (
          <ModelBadge
            modelId={modelId}
            modelName={model?.name || modelId}
            provider={model?.provider || getProviderFromModelId(modelId)}
          />
        )}

        {/* Actions */}
        <div
          className={cn(
            'flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100',
            isUser ? 'flex-row-reverse' : 'flex-row'
          )}
        >
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {copied ? 'Copied!' : 'Copy'}
              </TooltipContent>
            </Tooltip>

            {!isUser && !isStreaming && message.content && (
              <ReadAloudButton text={message.content} />
            )}

            {!isUser && !isStreaming && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Regenerate</TooltipContent>
              </Tooltip>
            )}
          </TooltipProvider>
        </div>
      </div>
    </div>
  )
}

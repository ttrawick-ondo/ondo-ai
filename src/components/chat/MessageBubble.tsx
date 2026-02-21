'use client'

import { useState, useRef, useCallback } from 'react'
import { Copy, Check, User, Bot, RotateCcw, Wrench, GitBranch } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { MarkdownRenderer } from './MarkdownRenderer'
import { ThinkingDisplay } from './ThinkingDisplay'
import { ToolCallDisplay, ToolResultDisplay } from './ToolCallDisplay'
import { ContentWithCitations } from './CitedContent'
import { OndoBotResults } from './OndoBotResults'
import { isOndoBotStructuredResult } from '@/types/ondobot'
import { FilePreviewList } from './FilePreview'
import { ReadAloudButton } from './AudioPlayer'
import { RoutingIndicator } from './RoutingIndicator'
import { SelectionTooltip } from './SelectionTooltip'
import { ModelBadge } from '@/components/model'
import type { Message, AIProvider, ImageAttachment, FileAttachment } from '@/types'
import type { RequestIntent } from '@/lib/api/routing'
import { isFileAttachment } from '@/types'
import { useCurrentUser, useModels, useIsExecutingTools, useShowRoutingIndicator, useStreamingThinking } from '@/stores'

interface MessageBubbleProps {
  message: Message
  isStreaming?: boolean
  onBranch?: (messageId: string) => void
}

export function MessageBubble({ message, isStreaming, onBranch }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  const handleAskAboutThis = useCallback(
    (selectedText: string) => {
      if (onBranch) {
        // Store the selected text in sessionStorage so ChatInput can pick it up
        sessionStorage.setItem('branchContext', selectedText)
        onBranch(message.id)
      }
    },
    [onBranch, message.id]
  )
  const user = useCurrentUser()
  const models = useModels()
  const isExecutingTools = useIsExecutingTools()
  const showRoutingIndicator = useShowRoutingIndicator()
  const streamingThinking = useStreamingThinking()
  const isUser = message.role === 'user'
  const isTool = message.role === 'tool'
  const hasToolCalls = message.tool_calls && message.tool_calls.length > 0
  const imageAttachments = message.attachments?.filter((a): a is ImageAttachment => a.type === 'image') || []
  const fileAttachments = message.attachments?.filter((a): a is FileAttachment => isFileAttachment(a)) || []

  // Get model info for the badge
  const modelId = message.metadata?.model
  const model = modelId ? models.find((m) => m.id === modelId) : null

  // Get routing info from metadata
  const routingInfo = message.metadata?.routing

  // Determine provider from model ID if model config not found
  const getProviderFromModelId = (id: string): AIProvider => {
    if (id.startsWith('gpt-')) return 'openai'
    if (id.startsWith('claude-')) return 'anthropic'
    if (id.startsWith('glean-')) return 'glean'
    if (id.startsWith('dust-')) return 'dust'
    if (id.startsWith('ondobot-')) return 'ondobot'
    return 'anthropic'
  }

  const provider = model?.provider || (modelId ? getProviderFromModelId(modelId) : 'anthropic')

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Tool result messages are rendered inline with less prominence
  if (isTool) {
    const execution = message.tool_executions?.[0]
    return (
      <div className="ml-9">
        <ToolResultDisplay
          toolCallId={message.tool_call_id || ''}
          execution={execution}
        />
      </div>
    )
  }

  // ── User message ──────────────────────────────────────────────
  if (isUser) {
    return (
      <div className="group flex gap-3 justify-end">
        <div className="flex flex-col items-end max-w-[75%]">
          <div className="rounded-2xl rounded-br-sm bg-primary text-primary-foreground px-4 py-2.5">
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
              <p className="whitespace-pre-wrap text-[14px] leading-relaxed">{message.content}</p>
            )}
          </div>

          {/* Hover actions */}
          <div className="flex items-center gap-0.5 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopy}>
                    {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">{copied ? 'Copied!' : 'Copy'}</TooltipContent>
              </Tooltip>

              {!isStreaming && onBranch && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onBranch(message.id)}>
                      <GitBranch className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Branch from here</TooltipContent>
                </Tooltip>
              )}
            </TooltipProvider>
          </div>
        </div>

        <Avatar className="h-7 w-7 shrink-0 mt-1">
          <AvatarImage src={user?.avatarUrl} />
          <AvatarFallback>
            <User className="h-3.5 w-3.5" />
          </AvatarFallback>
        </Avatar>
      </div>
    )
  }

  // ── Assistant message ─────────────────────────────────────────
  return (
    <div className="group flex gap-3">
      {/* Icon — no avatar ring, just a subtle circle */}
      <div className="mt-0.5 shrink-0 h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
        <Bot className="h-3.5 w-3.5 text-primary" />
      </div>

      <div className="flex-1 min-w-0">
        {/* Content — no bubble, just flowing prose */}
        <div ref={contentRef} className="relative text-[14px] leading-relaxed">
          {/* Selection tooltip */}
          {onBranch && !isStreaming && (
            <SelectionTooltip
              containerRef={contentRef}
              onAskAboutThis={handleAskAboutThis}
            />
          )}

          {/* Thinking display (e.g. Glean reasoning) */}
          {(isStreaming && streamingThinking) || message.metadata?.thinking ? (
            <ThinkingDisplay
              thinking={isStreaming && streamingThinking ? streamingThinking : (message.metadata?.thinking || '')}
              isStreaming={isStreaming && !!streamingThinking}
            />
          ) : null}

          {/* Check for OndoBot structured data for rich rendering */}
          {message.metadata?.ondoBotStructured &&
           isOndoBotStructuredResult(message.metadata.ondoBotStructured) ? (
            <OndoBotResults
              structured={message.metadata.ondoBotStructured}
              className="min-w-[320px]"
            />
          ) : message.content && (
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
          {isStreaming && (
            <span className="inline-block w-1.5 h-4 ml-0.5 bg-primary/60 animate-pulse rounded-sm" />
          )}
        </div>

        {/* Footer: model badge + hover actions on same line */}
        <div className="flex items-center gap-1.5 mt-1.5">
          {modelId && (
            <ModelBadge
              modelId={modelId}
              modelName={model?.name || modelId}
              provider={provider}
            />
          )}
          {showRoutingIndicator && routingInfo?.wasAutoRouted && (
            <RoutingIndicator
              provider={provider}
              intent={routingInfo.intent as RequestIntent | undefined}
              wasAutoRouted={routingInfo.wasAutoRouted}
              confidence={routingInfo.confidence}
              size="sm"
            />
          )}

          {/* Hover actions — inline with badge */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopy}>
                    {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">{copied ? 'Copied!' : 'Copy'}</TooltipContent>
              </Tooltip>

              {!isStreaming && message.content && (
                <ReadAloudButton text={message.content} />
              )}

              {!isStreaming && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <RotateCcw className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Regenerate</TooltipContent>
                </Tooltip>
              )}

              {!isStreaming && onBranch && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onBranch(message.id)}>
                      <GitBranch className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Branch from here</TooltipContent>
                </Tooltip>
              )}
            </TooltipProvider>
          </div>
        </div>
      </div>
    </div>
  )
}

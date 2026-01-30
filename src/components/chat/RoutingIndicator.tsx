'use client'

import { Brain, Router, Sparkles, Code, Database, MessageSquare, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import type { AIProvider } from '@/types'
import type { RequestIntent } from '@/lib/api/routing'

interface RoutingIndicatorProps {
  provider: AIProvider
  intent?: RequestIntent
  wasAutoRouted?: boolean
  confidence?: number
  className?: string
  size?: 'sm' | 'md'
}

// Provider colors
const PROVIDER_COLORS: Record<AIProvider, string> = {
  glean: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  anthropic: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  openai: 'bg-green-500/10 text-green-600 border-green-500/20',
  dust: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  ondobot: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
}

// Provider display names
const PROVIDER_NAMES: Record<AIProvider, string> = {
  glean: 'Glean',
  anthropic: 'Claude',
  openai: 'GPT',
  dust: 'Dust',
  ondobot: 'OndoBot',
}

// Intent icons
const INTENT_ICONS: Record<RequestIntent, typeof Brain> = {
  knowledge_query: Database,
  code_task: Code,
  data_analysis: Sparkles,
  action_request: Zap,
  general_chat: MessageSquare,
}

// Intent display names
const INTENT_NAMES: Record<RequestIntent, string> = {
  knowledge_query: 'Knowledge',
  code_task: 'Code',
  data_analysis: 'Analysis',
  action_request: 'Action',
  general_chat: 'Chat',
}

export function RoutingIndicator({
  provider,
  intent,
  wasAutoRouted = false,
  confidence,
  className,
  size = 'sm',
}: RoutingIndicatorProps) {
  const IntentIcon = intent ? INTENT_ICONS[intent] : Brain
  const providerColor = PROVIDER_COLORS[provider]
  const providerName = PROVIDER_NAMES[provider]
  const intentName = intent ? INTENT_NAMES[intent] : undefined

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
  }

  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              'font-normal gap-1 border cursor-default',
              providerColor,
              sizeClasses[size],
              className
            )}
          >
            {wasAutoRouted && (
              <Router className={cn(iconSize, 'opacity-60')} />
            )}
            <IntentIcon className={iconSize} />
            <span>{providerName}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium">
              {wasAutoRouted ? 'Auto-routed' : 'Manually selected'}: {providerName}
            </p>
            {intentName && (
              <p className="text-muted-foreground text-xs">
                Intent: {intentName}
                {confidence !== undefined && ` (${Math.round(confidence * 100)}% confidence)`}
              </p>
            )}
            {wasAutoRouted && (
              <p className="text-muted-foreground text-xs">
                Request was automatically routed to the best provider based on content analysis.
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * Compact version for inline display
 */
export function RoutingIndicatorCompact({
  provider,
  intent,
  wasAutoRouted,
}: {
  provider: AIProvider
  intent?: RequestIntent
  wasAutoRouted?: boolean
}) {
  const IntentIcon = intent ? INTENT_ICONS[intent] : Brain
  const providerName = PROVIDER_NAMES[provider]

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            {wasAutoRouted && <Router className="h-3 w-3" />}
            <IntentIcon className="h-3 w-3" />
            <span>{providerName}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {wasAutoRouted ? 'Auto-routed to' : 'Using'} {providerName}
            {intent && ` for ${INTENT_NAMES[intent].toLowerCase()} task`}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

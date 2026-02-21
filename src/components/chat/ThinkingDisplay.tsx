'use client'

import { useState, useEffect } from 'react'
import { ChevronRight, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ThinkingDisplayProps {
  thinking: string
  isStreaming?: boolean
}

export function ThinkingDisplay({ thinking, isStreaming }: ThinkingDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Collapse when streaming finishes
  useEffect(() => {
    if (!isStreaming) {
      setIsExpanded(false)
    }
  }, [isStreaming])

  if (!thinking) return null

  return (
    <div className="mb-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors',
          isStreaming && 'text-primary/70'
        )}
      >
        {isExpanded ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        Thinking
        {isStreaming && (
          <span className="inline-block w-1 h-3 ml-0.5 bg-primary/50 animate-pulse rounded-sm" />
        )}
      </button>

      {isExpanded && (
        <div className="mt-1 ml-4 pl-3 border-l-2 border-muted">
          <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {thinking}
            {isStreaming && (
              <span className="inline-block w-1 h-3 ml-0.5 bg-muted-foreground/50 animate-pulse rounded-sm align-middle" />
            )}
          </p>
        </div>
      )}
    </div>
  )
}

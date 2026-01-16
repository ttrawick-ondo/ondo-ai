'use client'

import { useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { SourceTypeIcon, getSourceTypeLabel } from './SourceTypeIcon'
import type { Citation } from '@/types'

interface CitationInlineProps {
  citation: Citation
  onClick?: () => void
}

export function CitationInline({ citation, onClick }: CitationInlineProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'inline-flex items-center justify-center',
            'text-[10px] font-medium',
            'min-w-[16px] h-4 px-1 rounded',
            'bg-primary/10 text-primary hover:bg-primary/20',
            'cursor-pointer transition-colors',
            '-translate-y-0.5'
          )}
          onClick={(e) => {
            e.stopPropagation()
            if (onClick) {
              onClick()
            }
          }}
        >
          {citation.number}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0"
        align="start"
        side="top"
        sideOffset={5}
      >
        <div className="p-3">
          <div className="flex items-start gap-2">
            <SourceTypeIcon type={citation.source.type} size="md" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{citation.source.title}</p>
              <p className="text-xs text-muted-foreground">
                {getSourceTypeLabel(citation.source.type)}
                {citation.source.author && ` · ${citation.source.author}`}
              </p>
            </div>
          </div>

          {citation.snippet && (
            <p className="mt-2 text-xs text-muted-foreground line-clamp-3">
              &ldquo;{citation.snippet}&rdquo;
            </p>
          )}

          {citation.relevanceScore !== undefined && (
            <div className="mt-2 flex items-center gap-1">
              <span className="text-xs text-muted-foreground">Relevance:</span>
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${citation.relevanceScore * 100}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">
                {Math.round(citation.relevanceScore * 100)}%
              </span>
            </div>
          )}
        </div>

        <div className="border-t p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 h-8"
            asChild
          >
            <a
              href={citation.source.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-3 w-3" />
              Open in {getSourceTypeLabel(citation.source.type)}
            </a>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

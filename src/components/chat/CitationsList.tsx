'use client'

import { useState } from 'react'
import { ExternalLink, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { SourceTypeIcon, getSourceTypeLabel } from './SourceTypeIcon'
import type { Citation } from '@/types'

interface CitationsListProps {
  citations: Citation[]
  defaultExpanded?: boolean
}

export function CitationsList({ citations }: CitationsListProps) {
  const [panelOpen, setPanelOpen] = useState(false)

  if (citations.length === 0) return null

  const handleOpenUrl = (e: React.MouseEvent, url: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (url && url !== '#') {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  // Get unique source types for the compact badge (max 3 icons)
  const uniqueSourceTypes = Array.from(new Set(citations.map((c) => c.source.type))).slice(0, 3)

  return (
    <>
      {/* Compact sources badge — stacked unique source icons + count, opens panel */}
      <div className="mt-3">
        <button
          onClick={() => setPanelOpen(true)}
          className={cn(
            'inline-flex items-center gap-2 px-3 py-1.5 rounded-full',
            'text-sm font-medium',
            'bg-muted hover:bg-muted/80 text-foreground',
            'border border-border',
            'transition-colors cursor-pointer'
          )}
        >
          <div className="flex -space-x-0.5">
            {uniqueSourceTypes.map((type) => (
              <SourceTypeIcon key={type} type={type} size="sm" />
            ))}
          </div>
          <span>{citations.length} sources</span>
        </button>
      </div>

      {/* Slide-out panel */}
      <Sheet open={panelOpen} onOpenChange={setPanelOpen}>
        <SheetContent side="right" className="w-[380px] sm:max-w-[380px] overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Sources ({citations.length})
            </SheetTitle>
            <SheetDescription>
              References from your knowledge base
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-3">
            {citations.map((citation) => (
              <div
                key={citation.id}
                className="rounded-lg border border-border hover:border-border/80 hover:bg-muted/30 p-3 transition-colors"
              >
                <div className="flex items-start gap-2.5">
                  <Badge variant="secondary" className="h-5 w-5 p-0 justify-center shrink-0 text-[10px]">
                    {citation.number}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <SourceTypeIcon type={citation.source.type} size="sm" />
                      <span className="text-xs text-muted-foreground">
                        {getSourceTypeLabel(citation.source.type)}
                      </span>
                    </div>
                    <p className="text-sm font-medium mt-1 line-clamp-2">
                      {citation.source.title}
                    </p>
                    {citation.snippet && (
                      <p className="text-xs text-muted-foreground mt-1.5 line-clamp-3">
                        {citation.snippet}
                      </p>
                    )}
                    {citation.source.author && (
                      <p className="text-[11px] text-muted-foreground mt-1.5">
                        by {citation.source.author}
                        {citation.source.date && ` · ${citation.source.date}`}
                      </p>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 h-7 text-xs gap-1.5"
                      onClick={(e) => handleOpenUrl(e, citation.source.url)}
                    >
                      <ExternalLink className="h-3 w-3" />
                      Open source
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

// Compact inline version for showing citation count
interface CitationsCountProps {
  count: number
  onClick: () => void
}

export function CitationsCount({ count, onClick }: CitationsCountProps) {
  if (count === 0) return null

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-6 px-2 gap-1 text-xs text-muted-foreground"
      onClick={onClick}
    >
      <BookOpen className="h-3 w-3" />
      {count} source{count > 1 ? 's' : ''}
    </Button>
  )
}

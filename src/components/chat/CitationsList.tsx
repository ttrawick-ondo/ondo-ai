'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, ExternalLink, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { SourceTypeIcon, getSourceTypeLabel } from './SourceTypeIcon'
import type { Citation, CitationSourceType } from '@/types'

interface CitationsListProps {
  citations: Citation[]
  defaultExpanded?: boolean
}

export function CitationsList({ citations, defaultExpanded = false }: CitationsListProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const [showAll, setShowAll] = useState(false)

  if (citations.length === 0) return null

  // Group citations by source type
  const groupedCitations = citations.reduce((acc, citation) => {
    const type = citation.source.type
    if (!acc[type]) {
      acc[type] = []
    }
    acc[type].push(citation)
    return acc
  }, {} as Record<CitationSourceType, Citation[]>)

  const displayCitations = showAll ? citations : citations.slice(0, 5)
  const hasMore = citations.length > 5

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded} className="mt-3">
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between h-8 px-2 hover:bg-muted/50"
        >
          <div className="flex items-center gap-2">
            <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Sources ({citations.length})
            </span>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="pt-2 space-y-2">
          {displayCitations.map((citation) => (
            <CitationCard key={citation.id} citation={citation} />
          ))}

          {hasMore && !showAll && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-7 text-xs"
              onClick={() => setShowAll(true)}
            >
              Show {citations.length - 5} more sources
            </Button>
          )}

          {showAll && hasMore && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-7 text-xs"
              onClick={() => setShowAll(false)}
            >
              Show less
            </Button>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

interface CitationCardProps {
  citation: Citation
}

function CitationCard({ citation }: CitationCardProps) {
  return (
    <a
      href={citation.source.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'block rounded-lg border p-2',
        'hover:bg-muted/50 transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-ring'
      )}
    >
      <div className="flex items-start gap-2">
        <Badge variant="secondary" className="h-5 w-5 p-0 justify-center shrink-0">
          {citation.number}
        </Badge>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <SourceTypeIcon type={citation.source.type} size="sm" />
            <span className="text-xs font-medium truncate">
              {citation.source.title}
            </span>
            <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0 ml-auto" />
          </div>
          {citation.snippet && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {citation.snippet}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-muted-foreground">
              {getSourceTypeLabel(citation.source.type)}
            </span>
            {citation.source.author && (
              <>
                <span className="text-[10px] text-muted-foreground">·</span>
                <span className="text-[10px] text-muted-foreground">
                  {citation.source.author}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </a>
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

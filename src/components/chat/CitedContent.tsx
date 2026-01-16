'use client'

import { Fragment } from 'react'
import { MarkdownRenderer } from './MarkdownRenderer'
import { CitationInline } from './CitationInline'
import { CitationsList } from './CitationsList'
import { splitContentByCitations } from '@/lib/utils/citationParser'
import type { Citation } from '@/types'

interface CitedContentProps {
  content: string
  citations?: Citation[]
  showCitationsList?: boolean
}

export function CitedContent({ content, citations = [], showCitationsList = true }: CitedContentProps) {
  const hasCitations = citations.length > 0

  // If no citations, just render markdown
  if (!hasCitations) {
    return <MarkdownRenderer content={content} />
  }

  // Split content into segments
  const segments = splitContentByCitations(content)

  // Map citation numbers to citation objects
  const citationMap = new Map(citations.map((c) => [c.number, c]))

  return (
    <div>
      <div className="prose prose-sm dark:prose-invert max-w-none">
        {segments.map((segment, index) => {
          if (segment.type === 'text') {
            // For text segments, we need to render markdown
            // But since we're splitting, we'll render as spans with dangerouslySetInnerHTML
            // For simplicity, render text directly here
            return (
              <Fragment key={index}>
                <MarkdownRenderer content={segment.value} />
              </Fragment>
            )
          }

          // For citation segments, render inline citation
          const citation = segment.number ? citationMap.get(segment.number) : undefined
          if (citation) {
            return (
              <CitationInline
                key={index}
                citation={citation}
              />
            )
          }

          // Fallback: render the marker as text if citation not found
          return <span key={index}>{segment.value}</span>
        })}
      </div>

      {showCitationsList && hasCitations && (
        <CitationsList citations={citations} />
      )}
    </div>
  )
}

// Simpler version that renders markdown and adds citations list below
interface ContentWithCitationsProps {
  content: string
  citations?: Citation[]
}

export function ContentWithCitations({ content, citations = [] }: ContentWithCitationsProps) {
  return (
    <div>
      <MarkdownRenderer content={content} />
      {citations.length > 0 && (
        <CitationsList citations={citations} />
      )}
    </div>
  )
}

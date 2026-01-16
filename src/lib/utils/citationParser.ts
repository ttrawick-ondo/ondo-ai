import type { Citation, CitationSource, CitationSourceType } from '@/types'
import { generateId } from '@/lib/utils'

interface ParsedCitation {
  marker: string // [1], [2], etc.
  number: number
  startIndex: number
  endIndex: number
}

interface GleanCitationData {
  title?: string
  url?: string
  snippet?: string
  excerpt?: string
  source?: string
  sourceType?: string
  author?: string
  date?: string
  relevanceScore?: number
}

/**
 * Parse citation markers from text content
 * Supports formats: [1], [2], [1,2], [1-3]
 */
export function parseCitationMarkers(content: string): ParsedCitation[] {
  const markers: ParsedCitation[] = []
  const regex = /\[(\d+(?:[,-]\d+)*)\]/g
  let match

  while ((match = regex.exec(content)) !== null) {
    const markerText = match[1]

    // Handle single number [1]
    if (/^\d+$/.test(markerText)) {
      markers.push({
        marker: match[0],
        number: parseInt(markerText, 10),
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      })
    }
    // Handle comma-separated [1,2,3]
    else if (markerText.includes(',')) {
      const numbers = markerText.split(',').map((n) => parseInt(n.trim(), 10))
      numbers.forEach((num) => {
        markers.push({
          marker: `[${num}]`,
          number: num,
          startIndex: match!.index,
          endIndex: match!.index + match![0].length,
        })
      })
    }
    // Handle range [1-3]
    else if (markerText.includes('-')) {
      const [start, end] = markerText.split('-').map((n) => parseInt(n.trim(), 10))
      for (let num = start; num <= end; num++) {
        markers.push({
          marker: `[${num}]`,
          number: num,
          startIndex: match.index,
          endIndex: match.index + match[0].length,
        })
      }
    }
  }

  return markers
}

/**
 * Map source type string to CitationSourceType
 */
export function mapSourceType(type?: string): CitationSourceType {
  if (!type) return 'custom'

  const typeMap: Record<string, CitationSourceType> = {
    confluence: 'confluence',
    slack: 'slack',
    github: 'github',
    jira: 'jira',
    gdrive: 'gdrive',
    'google drive': 'gdrive',
    notion: 'notion',
  }

  const normalized = type.toLowerCase()
  return typeMap[normalized] || 'custom'
}

/**
 * Parse Glean citation data into Citation objects
 */
export function parseGleanCitations(citationsData: GleanCitationData[]): Citation[] {
  return citationsData.map((data, index) => ({
    id: generateId(),
    number: index + 1,
    text: data.title || 'Untitled',
    source: {
      type: mapSourceType(data.sourceType),
      title: data.title || 'Untitled',
      url: data.url || '#',
      author: data.author,
      date: data.date,
    },
    relevanceScore: data.relevanceScore,
    snippet: data.snippet || data.excerpt || '',
  }))
}

/**
 * Extract unique citation numbers from content
 */
export function extractCitationNumbers(content: string): number[] {
  const markers = parseCitationMarkers(content)
  const numbers = new Set(markers.map((m) => m.number))
  return Array.from(numbers).sort((a, b) => a - b)
}

/**
 * Check if content contains citation markers
 */
export function hasCitations(content: string): boolean {
  return /\[\d+\]/.test(content)
}

/**
 * Split content into segments with citation markers
 */
export function splitContentByCitations(content: string): Array<{ type: 'text' | 'citation'; value: string; number?: number }> {
  const segments: Array<{ type: 'text' | 'citation'; value: string; number?: number }> = []
  const regex = /\[(\d+)\]/g
  let lastIndex = 0
  let match

  while ((match = regex.exec(content)) !== null) {
    // Add text before citation
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        value: content.slice(lastIndex, match.index),
      })
    }

    // Add citation
    segments.push({
      type: 'citation',
      value: match[0],
      number: parseInt(match[1], 10),
    })

    lastIndex = match.index + match[0].length
  }

  // Add remaining text
  if (lastIndex < content.length) {
    segments.push({
      type: 'text',
      value: content.slice(lastIndex),
    })
  }

  return segments
}

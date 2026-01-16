/**
 * Glean Search Tool
 * Allows AI to search enterprise knowledge base using Glean
 */

import { createTool } from '../registry'
import type { ToolResult } from '@/types/tools'

export const gleanSearchTool = createTool(
  'glean_search',
  'Search the company knowledge base using Glean. Use this to find internal documents, wiki pages, Slack messages, and other enterprise content. Returns relevant results with source information.',
  {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query. Be specific and use relevant keywords for best results.',
      },
      datasource: {
        type: 'string',
        description: 'Optional: Filter by data source (e.g., "confluence", "slack", "gdrive", "github", "notion", "jira").',
      },
      maxResults: {
        type: 'number',
        description: 'Maximum number of results to return (default: 5, max: 20).',
      },
    },
    required: ['query'],
  },
  async (args): Promise<ToolResult> => {
    try {
      const query = args.query as string
      const datasource = args.datasource as string | undefined
      const maxResults = Math.min((args.maxResults as number) || 5, 20)

      if (!query || query.trim().length === 0) {
        return {
          success: false,
          output: '',
          error: 'Search query cannot be empty',
        }
      }

      // Call the API endpoint
      const response = await fetch('/api/glean/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, datasource, maxResults }),
      })

      if (!response.ok) {
        const error = await response.json()
        return {
          success: false,
          output: '',
          error: error.error || 'Search failed',
        }
      }

      const result = await response.json()

      if (!result.citations || result.citations.length === 0) {
        return {
          success: true,
          output: `No results found for "${query}".`,
          metadata: { query, totalCount: 0 },
        }
      }

      // Format results for the AI
      const formattedResults = result.citations.map((citation: {
        title: string
        snippet: string
        sourceType: string
        url: string
        author?: string
        updatedAt?: string
      }, index: number) => {
        let entry = `${index + 1}. **${citation.title}**\n`
        entry += `   Source: ${citation.sourceType}\n`
        entry += `   ${citation.snippet}\n`
        entry += `   URL: ${citation.url}`
        if (citation.author) {
          entry += `\n   Author: ${citation.author}`
        }
        if (citation.updatedAt) {
          entry += `\n   Updated: ${new Date(citation.updatedAt).toLocaleDateString()}`
        }
        return entry
      }).join('\n\n')

      return {
        success: true,
        output: `Found ${result.totalCount} results for "${query}":\n\n${formattedResults}`,
        metadata: {
          query,
          totalCount: result.totalCount,
          citations: result.citations,
        },
      }
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : 'Glean search failed',
      }
    }
  }
)

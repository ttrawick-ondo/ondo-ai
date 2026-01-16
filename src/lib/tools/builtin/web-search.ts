/**
 * Web Search Tool (Mock Implementation)
 * In production, this would integrate with a search API like Bing, Google, or Tavily
 */

import { createTool } from '../registry'
import type { ToolResult } from '@/types/tools'

interface SearchResult {
  title: string
  url: string
  snippet: string
}

// Mock search results for demonstration
const MOCK_RESULTS: Record<string, SearchResult[]> = {
  default: [
    {
      title: 'Search Result 1',
      url: 'https://example.com/result1',
      snippet: 'This is a mock search result. In production, integrate with a real search API.',
    },
    {
      title: 'Search Result 2',
      url: 'https://example.com/result2',
      snippet: 'Consider using Bing Search API, Google Custom Search, or Tavily for production.',
    },
  ],
}

export const webSearchTool = createTool(
  'web_search',
  'Search the web for current information. Use this for questions about recent events, current data, or when you need to verify information.',
  {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query to look up on the web.',
      },
      num_results: {
        type: 'integer',
        description: 'Number of results to return (1-10). Default is 5.',
      },
    },
    required: ['query'],
  },
  async (args): Promise<ToolResult> => {
    try {
      const query = args.query as string
      const numResults = Math.min(Math.max((args.num_results as number) || 5, 1), 10)

      if (!query || query.trim().length === 0) {
        return {
          success: false,
          output: '',
          error: 'Search query cannot be empty',
        }
      }

      // In production, this would call a real search API
      // For now, return mock results with a note
      const results = MOCK_RESULTS.default.slice(0, numResults)

      const output = [
        `Search results for: "${query}"`,
        '',
        '(Note: This is a mock implementation. Integrate with a real search API for production use.)',
        '',
        ...results.map((r, i) => [
          `${i + 1}. ${r.title}`,
          `   URL: ${r.url}`,
          `   ${r.snippet}`,
          '',
        ].join('\n')),
      ].join('\n')

      return {
        success: true,
        output,
        metadata: {
          query,
          numResults: results.length,
          isMock: true,
          results,
        },
      }
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : 'Search failed',
      }
    }
  }
)

// Configuration for production search API
export interface SearchAPIConfig {
  provider: 'bing' | 'google' | 'tavily'
  apiKey: string
  endpoint?: string
}

// Placeholder for production implementation
export function configureSearchAPI(_config: SearchAPIConfig): void {
  // In production, this would configure the search API client
  console.log('Search API configuration - implement for production')
}

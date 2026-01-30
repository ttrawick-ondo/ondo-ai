/**
 * Web Search Tool with Tavily API Integration
 * Falls back to mock data if TAVILY_API_KEY is not configured
 */

import { createTool } from '../registry'
import type { ToolResult } from '@/types/tools'

interface SearchResult {
  title: string
  url: string
  snippet: string
  score?: number
}

interface TavilySearchResult {
  title: string
  url: string
  content: string
  score: number
  raw_content?: string
}

interface TavilySearchResponse {
  query: string
  follow_up_questions?: string[]
  answer?: string
  images?: string[]
  results: TavilySearchResult[]
  response_time: number
}

// Mock search results for when API key is not configured
const MOCK_RESULTS: SearchResult[] = [
  {
    title: 'Search Result 1',
    url: 'https://example.com/result1',
    snippet: 'This is a mock search result. Configure TAVILY_API_KEY for real search.',
  },
  {
    title: 'Search Result 2',
    url: 'https://example.com/result2',
    snippet: 'Visit tavily.com to get an API key for web search functionality.',
  },
]

async function searchWithTavily(
  query: string,
  numResults: number,
  apiKey: string
): Promise<{ results: SearchResult[]; answer?: string; responseTime: number }> {
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      max_results: numResults,
      search_depth: 'basic',
      include_answer: true,
      include_raw_content: false,
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Tavily API error: ${response.status} - ${errorBody}`)
  }

  const data: TavilySearchResponse = await response.json()

  return {
    results: data.results.map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.content,
      score: r.score,
    })),
    answer: data.answer,
    responseTime: data.response_time,
  }
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

      const apiKey = process.env.TAVILY_API_KEY

      // If no API key, use mock results
      if (!apiKey) {
        const results = MOCK_RESULTS.slice(0, numResults)
        const output = [
          `Search results for: "${query}"`,
          '',
          '⚠️ TAVILY_API_KEY not configured - showing mock results',
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
      }

      // Use real Tavily API
      const { results, answer, responseTime } = await searchWithTavily(query, numResults, apiKey)

      const outputParts: string[] = [
        `Search results for: "${query}"`,
        '',
      ]

      // Include AI-generated answer if available
      if (answer) {
        outputParts.push('📝 Summary:')
        outputParts.push(answer)
        outputParts.push('')
      }

      outputParts.push('📚 Sources:')
      outputParts.push('')

      for (let i = 0; i < results.length; i++) {
        const r = results[i]
        outputParts.push(`${i + 1}. ${r.title}`)
        outputParts.push(`   URL: ${r.url}`)
        outputParts.push(`   ${r.snippet}`)
        outputParts.push('')
      }

      return {
        success: true,
        output: outputParts.join('\n'),
        metadata: {
          query,
          numResults: results.length,
          isMock: false,
          responseTime,
          results,
          answer,
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

// Configuration for search API
export interface SearchAPIConfig {
  provider: 'tavily' | 'bing' | 'google'
  apiKey: string
  endpoint?: string
}

// Check if web search is configured
export function isWebSearchConfigured(): boolean {
  return !!process.env.TAVILY_API_KEY
}

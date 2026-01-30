/**
 * Knowledge Router
 *
 * Specialized handler for knowledge queries that routes through Glean.
 * Performs search + RAG to provide contextual answers with citations.
 */

import type { ChatCompletionRequest, ChatCompletionResponse, StreamEvent } from '@/types'
import { getProvider, GleanProvider } from '@/lib/api/providers'
import { getGleanSearchService } from '@/lib/api/glean'
import { createStartEvent, createDeltaEvent, createDoneEvent, createErrorEvent } from '@/lib/api/streaming/encoder'

export interface KnowledgeQueryOptions {
  /** Maximum search results to inject as context */
  maxSearchResults?: number
  /** Data source filter for search */
  datasourceFilter?: string
  /** Whether to include citations in response */
  includeCitations?: boolean
}

/**
 * Extract the query from the latest user message
 */
function extractQuery(messages: ChatCompletionRequest['messages']): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    if (msg.role === 'user') {
      if (typeof msg.content === 'string') {
        return msg.content
      }
      const textPart = msg.content?.find((p) => p.type === 'text')
      if (textPart && 'text' in textPart) {
        return textPart.text
      }
    }
  }
  return ''
}

/**
 * Format search results as context for the model
 */
function formatSearchContext(
  results: Array<{
    title: string
    url: string
    snippet: string
    source: string
  }>
): string {
  if (results.length === 0) {
    return ''
  }

  let context = '\n\n---\n**Relevant context from enterprise knowledge base:**\n\n'

  results.forEach((result, index) => {
    context += `[${index + 1}] **${result.title}** (${result.source})\n`
    context += `${result.snippet}\n`
    context += `Source: ${result.url}\n\n`
  })

  context += '---\n\n'
  return context
}

/**
 * Handle a knowledge query by searching Glean and using context for response
 *
 * This implements a simple RAG pattern:
 * 1. Search Glean for relevant documents
 * 2. Inject search results as context
 * 3. Use Glean's chat API for the response (which may add its own citations)
 */
export async function handleKnowledgeQuery(
  request: ChatCompletionRequest,
  options: KnowledgeQueryOptions = {}
): Promise<ChatCompletionResponse> {
  const { maxSearchResults = 5, datasourceFilter, includeCitations = true } = options

  const gleanProvider = getProvider('glean') as GleanProvider

  if (!gleanProvider.isConfigured()) {
    throw new Error('Glean provider is not configured')
  }

  // Step 1: Search for relevant context
  const query = extractQuery(request.messages)
  let searchContext = ''

  try {
    const searchService = getGleanSearchService()
    const searchResponse = await searchService.searchWithCitations(query, {
      maxResults: maxSearchResults,
      datasource: datasourceFilter,
    })

    if (searchResponse.citations.length > 0) {
      searchContext = formatSearchContext(
        searchResponse.citations.map((c) => ({
          title: c.title,
          url: c.url,
          snippet: c.snippet,
          source: c.datasource,
        }))
      )
    }
  } catch (error) {
    // Log but don't fail - proceed without search context
    console.warn('Glean search failed, proceeding without context:', error)
  }

  // Step 2: Enhance the request with search context
  const enhancedRequest = { ...request }

  if (searchContext) {
    // Prepend search context to system prompt
    const existingSystemPrompt = request.options?.systemPrompt || ''
    enhancedRequest.options = {
      ...request.options,
      systemPrompt:
        existingSystemPrompt +
        '\n\nUse the following relevant context from the enterprise knowledge base to help answer the user\'s question. ' +
        'Cite sources using [1], [2], etc. when referencing information from the context.' +
        searchContext,
    }
  }

  // Step 3: Use Glean provider for completion
  return gleanProvider.complete(enhancedRequest)
}

/**
 * Stream a knowledge query response
 */
export async function* streamKnowledgeQuery(
  request: ChatCompletionRequest,
  options: KnowledgeQueryOptions = {}
): AsyncGenerator<StreamEvent> {
  const { maxSearchResults = 5, datasourceFilter } = options

  const gleanProvider = getProvider('glean') as GleanProvider

  if (!gleanProvider.isConfigured()) {
    yield createErrorEvent('Glean provider is not configured')
    return
  }

  const id = `knowledge-${Date.now()}`
  yield createStartEvent(id)

  // Step 1: Search for relevant context
  const query = extractQuery(request.messages)
  let searchContext = ''

  try {
    const searchService = getGleanSearchService()
    const searchResponse = await searchService.searchWithCitations(query, {
      maxResults: maxSearchResults,
      datasource: datasourceFilter,
    })

    if (searchResponse.citations.length > 0) {
      searchContext = formatSearchContext(
        searchResponse.citations.map((c) => ({
          title: c.title,
          url: c.url,
          snippet: c.snippet,
          source: c.datasource,
        }))
      )
    }
  } catch (error) {
    console.warn('Glean search failed, proceeding without context:', error)
  }

  // Step 2: Enhance request with search context
  const enhancedRequest = { ...request }

  if (searchContext) {
    const existingSystemPrompt = request.options?.systemPrompt || ''
    enhancedRequest.options = {
      ...request.options,
      systemPrompt:
        existingSystemPrompt +
        '\n\nUse the following relevant context from the enterprise knowledge base to help answer the user\'s question. ' +
        'Cite sources using [1], [2], etc. when referencing information from the context.' +
        searchContext,
    }
  }

  // Step 3: Stream from Glean provider
  try {
    for await (const event of gleanProvider.stream(enhancedRequest)) {
      yield event
    }
  } catch (error) {
    yield createErrorEvent(error instanceof Error ? error.message : 'Stream failed')
  }
}

/**
 * Check if a request should use the knowledge router
 */
export function shouldUseKnowledgeRouter(intent: string): boolean {
  return intent === 'knowledge_query'
}

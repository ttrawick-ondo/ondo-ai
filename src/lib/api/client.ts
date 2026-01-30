import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  StreamCallbacks,
  StreamEvent,
  ProvidersResponse,
  GleanAgentConfig,
  CreateGleanAgentInput,
  UpdateGleanAgentInput,
  GleanDataSource,
} from '@/types'
import type { GleanAgent, GleanCitation } from './glean/types'
import { parseSSEResponse } from './streaming/encoder'
import { withRetry, type RetryOptions } from './utils/retry'
import { RateLimitError, APIError } from './errors/apiErrors'

// Default retry options for API calls
const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  retryableStatusCodes: [429, 500, 502, 503, 504],
}

class APIClient {
  private baseUrl: string
  private retryOptions: RetryOptions

  constructor(baseUrl: string = '', retryOptions: RetryOptions = DEFAULT_RETRY_OPTIONS) {
    this.baseUrl = baseUrl
    this.retryOptions = retryOptions
  }

  private async fetch<T>(
    path: string,
    options?: RequestInit
  ): Promise<T> {
    return withRetry(async () => {
      const response = await fetch(`${this.baseUrl}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      })

      if (!response.ok) {
        const statusCode = response.status

        // Handle rate limiting
        if (statusCode === 429) {
          const retryAfter = response.headers.get('retry-after')
          const retryAfterSec = retryAfter ? parseInt(retryAfter, 10) : undefined
          throw new RateLimitError('openai', retryAfterSec)
        }

        // Parse error response
        const error = await response.json().catch(() => ({
          message: response.statusText,
        }))

        throw new APIError(
          error.message || 'API request failed',
          statusCode,
          error.code || 'API_ERROR'
        )
      }

      return response.json()
    }, this.retryOptions)
  }
}

export class ChatClient {
  private baseUrl: string
  private retryOptions: RetryOptions

  constructor(baseUrl: string = '', retryOptions: RetryOptions = DEFAULT_RETRY_OPTIONS) {
    this.baseUrl = baseUrl
    this.retryOptions = retryOptions
  }

  async complete(
    request: Omit<ChatCompletionRequest, 'options'> & {
      options?: ChatCompletionRequest['options'] & { stream?: false }
    }
  ): Promise<ChatCompletionResponse> {
    return withRetry(async () => {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...request,
          options: {
            ...request.options,
            stream: false,
          },
        }),
      })

      if (!response.ok) {
        const statusCode = response.status

        // Handle rate limiting
        if (statusCode === 429) {
          const retryAfter = response.headers.get('retry-after')
          const retryAfterSec = retryAfter ? parseInt(retryAfter, 10) : undefined
          throw new RateLimitError('openai', retryAfterSec)
        }

        const error = await response.json().catch(() => ({
          message: response.statusText,
        }))
        throw new APIError(
          error.message || 'Chat request failed',
          statusCode,
          error.code || 'CHAT_ERROR'
        )
      }

      return response.json()
    }, this.retryOptions)
  }

  async stream(
    request: Omit<ChatCompletionRequest, 'options'> & {
      options?: Omit<ChatCompletionRequest['options'], 'stream'>
    },
    callbacks: StreamCallbacks,
    options: StreamOptions = {}
  ): Promise<void> {
    const {
      timeout = 120000, // 2 minutes default
      chunkTimeout = 30000, // 30 seconds between chunks
    } = options

    // Create abort controller for timeout
    const controller = new AbortController()
    let overallTimeoutId: ReturnType<typeof setTimeout> | undefined
    let chunkTimeoutId: ReturnType<typeof setTimeout> | undefined

    const clearTimeouts = () => {
      if (overallTimeoutId) clearTimeout(overallTimeoutId)
      if (chunkTimeoutId) clearTimeout(chunkTimeoutId)
    }

    const resetChunkTimeout = () => {
      if (chunkTimeoutId) clearTimeout(chunkTimeoutId)
      chunkTimeoutId = setTimeout(() => {
        controller.abort()
        callbacks.onError?.('Stream chunk timeout - no data received for 30 seconds')
      }, chunkTimeout)
    }

    // Set overall timeout
    overallTimeoutId = setTimeout(() => {
      controller.abort()
      callbacks.onError?.('Stream timeout - overall request exceeded 2 minutes')
    }, timeout)

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...request,
          options: {
            ...request.options,
            stream: true,
          },
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        clearTimeouts()
        const statusCode = response.status

        // Handle rate limiting
        if (statusCode === 429) {
          const retryAfter = response.headers.get('retry-after')
          const retryAfterSec = retryAfter ? parseInt(retryAfter, 10) : undefined
          callbacks.onError?.(`Rate limit exceeded. ${retryAfterSec ? `Retry after ${retryAfterSec} seconds.` : 'Please try again later.'}`)
          return
        }

        const error = await response.json().catch(() => ({
          message: response.statusText,
        }))
        callbacks.onError?.(error.message || 'Stream request failed')
        return
      }

      const reader = response.body?.getReader()
      if (!reader) {
        clearTimeouts()
        callbacks.onError?.('No response body')
        return
      }

      const decoder = new TextDecoder()
      let buffer = ''

      // Start chunk timeout monitoring
      resetChunkTimeout()

      try {
        while (true) {
          const { done, value } = await reader.read()

          if (done) {
            clearTimeouts()
            break
          }

          // Reset chunk timeout on each chunk received
          resetChunkTimeout()

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n\n')

          // Keep the last potentially incomplete line in the buffer
          buffer = lines.pop() || ''

          for (const line of lines) {
            const event = parseSSEResponse(line)
            if (!event) continue

            switch (event.type) {
              case 'start':
                callbacks.onStart?.()
                break
              case 'delta':
                if (event.data.delta) {
                  callbacks.onDelta?.(event.data.delta)
                }
                if (event.data.tool_call_delta) {
                  callbacks.onToolCallDelta?.(event.data.tool_call_delta)
                }
                break
              case 'done':
                clearTimeouts()
                if (event.data.usage && event.data.metadata) {
                  callbacks.onDone?.({
                    id: event.data.id || '',
                    message: {
                      role: 'assistant',
                      content: event.data.content ?? null,
                      ...(event.data.tool_calls && { tool_calls: event.data.tool_calls }),
                    },
                    metadata: event.data.metadata,
                    usage: event.data.usage,
                  })
                }
                break
              case 'error':
                clearTimeouts()
                callbacks.onError?.(event.data.error || 'Unknown error')
                break
            }
          }
        }
      } finally {
        clearTimeouts()
        reader.releaseLock()
      }
    } catch (error) {
      clearTimeouts()
      if (error instanceof Error && error.name === 'AbortError') {
        // Timeout was already reported via callback
        return
      }
      callbacks.onError?.(error instanceof Error ? error.message : 'Stream error')
    }
  }
}

export interface StreamOptions {
  /** Overall timeout in ms (default: 120000 = 2 minutes) */
  timeout?: number
  /** Timeout between chunks in ms (default: 30000 = 30 seconds) */
  chunkTimeout?: number
}

export class ProvidersClient {
  private baseUrl: string

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl
  }

  async getProviders(): Promise<ProvidersResponse> {
    const response = await fetch(`${this.baseUrl}/api/providers`)

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: response.statusText,
      }))
      throw new Error(error.message || 'Failed to fetch providers')
    }

    return response.json()
  }
}

/**
 * GleanClient - Client for Glean API operations
 *
 * IMPORTANT: Glean does NOT support agent CRUD via API.
 * Agents must be created/updated/deleted via the Glean Agent Builder UI.
 * This client supports:
 * - Listing/searching agents (read-only)
 * - Getting agent metadata (read-only)
 * - Executing agents (run)
 * - Listing data sources (read-only)
 *
 * The legacy CRUD methods are kept for backwards compatibility but will throw errors.
 */
export class GleanClient {
  private baseUrl: string

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl
  }

  /**
   * Search/list agents from Glean
   * Uses the real Glean Agents API (POST /rest/api/v1/agents/search)
   */
  async searchAgents(options?: {
    query?: string
    pageSize?: number
    cursor?: string
  }): Promise<{ agents: GleanAgent[]; cursor?: string; hasMoreResults: boolean }> {
    const params = new URLSearchParams()
    if (options?.query) params.set('query', options.query)
    if (options?.pageSize) params.set('pageSize', options.pageSize.toString())
    if (options?.cursor) params.set('cursor', options.cursor)

    const response = await fetch(`${this.baseUrl}/api/glean/agents?${params}`)

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: response.statusText,
      }))
      throw new Error(error.message || 'Failed to search agents')
    }

    return response.json()
  }

  /**
   * @deprecated Use searchAgents() instead. This method is kept for backwards compatibility.
   */
  async listAgents(workspaceId: string): Promise<GleanAgentConfig[]> {
    // Map to new API - workspaceId is no longer needed
    const result = await this.searchAgents()

    // Convert GleanAgent to GleanAgentConfig for backwards compatibility
    return result.agents.map((agent) => ({
      id: agent.id,
      name: agent.name,
      description: agent.description,
      systemPrompt: '', // Not available from list API
      dataSources: [], // Not available from list API
      temperature: 0.7, // Default
      workspaceId,
      createdAt: new Date(agent.createdAt),
      updatedAt: new Date(agent.updatedAt),
    }))
  }

  /**
   * Get agent metadata from Glean (read-only)
   * Uses GET /rest/api/v1/agents/{agent_id}
   */
  async getAgentMetadata(agentId: string): Promise<GleanAgent> {
    const response = await fetch(`${this.baseUrl}/api/glean/agents/${agentId}`)

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: response.statusText,
      }))
      throw new Error(error.message || 'Failed to get agent')
    }

    const data = await response.json()
    return data.agent
  }

  /**
   * @deprecated Use getAgentMetadata() instead. This method is kept for backwards compatibility.
   */
  async getAgent(agentId: string): Promise<GleanAgentConfig> {
    const agent = await this.getAgentMetadata(agentId)

    // Convert to GleanAgentConfig for backwards compatibility
    return {
      id: agent.id,
      name: agent.name,
      description: agent.description,
      systemPrompt: '', // Not available from API
      dataSources: [], // Not available from API
      temperature: 0.7, // Default
      workspaceId: '',
      createdAt: new Date(agent.createdAt),
      updatedAt: new Date(agent.updatedAt),
    }
  }

  /**
   * Execute an agent
   * Uses POST /api/glean/agents/{agentId}/run
   */
  async runAgent(
    agentId: string,
    message: string,
    options?: { conversationId?: string }
  ): Promise<{
    content: string
    citations: GleanCitation[]
    conversationId?: string
  }> {
    const response = await fetch(
      `${this.baseUrl}/api/glean/agents/${agentId}/run`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          conversationId: options?.conversationId,
        }),
      }
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: response.statusText,
      }))
      throw new Error(error.message || 'Failed to run agent')
    }

    return response.json()
  }

  /**
   * Execute an agent with streaming response
   * Uses POST /api/glean/agents/{agentId}/run with stream=true
   */
  async *runAgentStream(
    agentId: string,
    message: string,
    options?: { conversationId?: string }
  ): AsyncGenerator<{ type: string; content?: string; citations?: GleanCitation[] }> {
    const response = await fetch(
      `${this.baseUrl}/api/glean/agents/${agentId}/run`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({
          message,
          conversationId: options?.conversationId,
          stream: true,
        }),
      }
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: response.statusText,
      }))
      throw new Error(error.message || 'Failed to stream agent run')
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('No response body')
    }

    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n')

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') continue

          try {
            yield JSON.parse(data)
          } catch {
            // Ignore parse errors
          }
        }
      }
    }
  }

  /**
   * @deprecated Agent creation is NOT supported via Glean API.
   * Use the Glean Agent Builder UI instead: https://app.glean.com/admin/platform/agents
   * This method will throw an error when called.
   */
  async createAgent(
    workspaceId: string,
    input: CreateGleanAgentInput
  ): Promise<GleanAgentConfig> {
    const response = await fetch(
      `${this.baseUrl}/api/glean/agents?workspaceId=${encodeURIComponent(workspaceId)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }
    )

    const error = await response.json().catch(() => ({
      message: response.statusText,
    }))
    throw new Error(
      error.message ||
        'Agent creation via API is not supported. Use Glean Agent Builder UI.'
    )
  }

  /**
   * @deprecated Agent update is NOT supported via Glean API.
   * Use the Glean Agent Builder UI instead: https://app.glean.com/admin/platform/agents
   * This method will throw an error when called.
   */
  async updateAgent(
    agentId: string,
    input: UpdateGleanAgentInput
  ): Promise<GleanAgentConfig> {
    const response = await fetch(`${this.baseUrl}/api/glean/agents/${agentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })

    const error = await response.json().catch(() => ({
      message: response.statusText,
    }))
    throw new Error(
      error.message ||
        'Agent update via API is not supported. Use Glean Agent Builder UI.'
    )
  }

  /**
   * @deprecated Agent deletion is NOT supported via Glean API.
   * Use the Glean Agent Builder UI instead: https://app.glean.com/admin/platform/agents
   * This method will throw an error when called.
   */
  async deleteAgent(agentId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/glean/agents/${agentId}`, {
      method: 'DELETE',
    })

    const error = await response.json().catch(() => ({
      message: response.statusText,
    }))
    throw new Error(
      error.message ||
        'Agent deletion via API is not supported. Use Glean Agent Builder UI.'
    )
  }

  /**
   * List available data sources from Glean
   */
  async listDataSources(): Promise<GleanDataSource[]> {
    const response = await fetch(`${this.baseUrl}/api/glean/search`, {
      method: 'GET',
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: response.statusText,
      }))
      throw new Error(error.message || 'Failed to list data sources')
    }

    const data = await response.json()
    return data.dataSources || []
  }

  /**
   * Search Glean knowledge base
   */
  async search(
    query: string,
    options?: { datasource?: string; maxResults?: number }
  ): Promise<{ citations: GleanCitation[]; totalCount: number }> {
    const response = await fetch(`${this.baseUrl}/api/glean/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        datasource: options?.datasource,
        maxResults: options?.maxResults,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: response.statusText,
      }))
      throw new Error(error.message || 'Search failed')
    }

    return response.json()
  }
}

// Export singleton instances
export const chatClient = new ChatClient()
export const providersClient = new ProvidersClient()
export const gleanClient = new GleanClient()

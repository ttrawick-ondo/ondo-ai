import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  StreamEvent,
  TokenUsage,
  GleanDataSource,
} from '@/types'
import type {
  GleanAgent,
  GleanAgentSearchRequest,
  GleanAgentSearchResponse,
  GleanAgentRunRequest,
  GleanAgentRunResponse,
  GleanAgentSchema,
  GleanCitation,
} from '../glean/types'
import { BaseProvider } from './base'
import { getModelConfig } from '../config/providers'
import { handleProviderError, ModelNotFoundError, APIError } from '../errors/apiErrors'
import { createStartEvent, createDeltaEvent, createDoneEvent, createErrorEvent } from '../streaming/encoder'

interface GleanChatRequest {
  messages: Array<{
    role: 'user' | 'assistant'
    content: string
  }>
  agentId?: string
  stream?: boolean
}

interface GleanChatResponse {
  id: string
  message: {
    role: 'assistant'
    content: string
  }
  citations?: GleanInternalCitation[]
}

interface GleanInternalCitation {
  title: string
  url: string
  snippet: string
  source: string
}

export class GleanProvider extends BaseProvider {
  provider = 'glean' as const

  private getBaseUrl(): string {
    return this.getApiUrl() || 'https://api.glean.com/v1'
  }

  protected async healthCheck(): Promise<void> {
    const response = await fetch(`${this.getBaseUrl()}/health`, {
      headers: this.getHeaders(),
    })

    if (!response.ok) {
      throw new Error(`Glean health check failed: ${response.status}`)
    }
  }

  private getHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.getApiKey()}`,
      'Content-Type': 'application/json',
    }
  }

  async complete(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const startTime = Date.now()
    const model = getModelConfig(request.model)

    if (!model || model.provider !== 'glean') {
      throw new ModelNotFoundError(request.model, 'glean')
    }

    try {
      const gleanRequest: GleanChatRequest = {
        // Filter out tool messages (not supported by Glean)
        messages: request.messages
          .filter((msg) => msg.role !== 'tool')
          .map((msg) => {
            // Extract text content (Glean doesn't support images)
            const textContent = typeof msg.content === 'string'
              ? msg.content
              : msg.content?.find((p) => p.type === 'text')?.text || ''
            return {
              role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
              content: textContent,
            }
          }),
        stream: false,
      }

      // If the model ID contains an agent ID, extract it
      if (request.model.startsWith('glean-agent-')) {
        gleanRequest.agentId = request.model.replace('glean-agent-', '')
      }

      const response = await fetch(`${this.getBaseUrl()}/chat`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(gleanRequest),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new APIError(`Glean API error: ${errorText}`, response.status)
      }

      const data: GleanChatResponse = await response.json()

      // Append citations if available
      let content = data.message.content
      if (data.citations && data.citations.length > 0) {
        content += '\n\n---\n**Sources:**\n'
        data.citations.forEach((citation, index) => {
          content += `${index + 1}. [${citation.title}](${citation.url})\n`
        })
      }

      // Estimate tokens (Glean doesn't provide token counts)
      const inputTokens = await this.countTokens(request.messages)
      const outputTokens = Math.ceil(content.length / 4)

      const usage: TokenUsage = {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
      }

      return {
        id: data.id,
        message: {
          role: 'assistant',
          content,
        },
        metadata: {
          model: request.model,
          provider: 'glean',
          processingTimeMs: Date.now() - startTime,
          finishReason: 'stop',
        },
        usage,
      }
    } catch (error) {
      throw handleProviderError(error, 'glean')
    }
  }

  async *stream(request: ChatCompletionRequest): AsyncGenerator<StreamEvent> {
    const startTime = Date.now()
    const model = getModelConfig(request.model)

    if (!model || model.provider !== 'glean') {
      throw new ModelNotFoundError(request.model, 'glean')
    }

    const id = this.generateId()
    yield createStartEvent(id)

    try {
      const gleanRequest: GleanChatRequest = {
        // Filter out tool messages (not supported by Glean)
        messages: request.messages
          .filter((msg) => msg.role !== 'tool')
          .map((msg) => {
            // Extract text content (Glean doesn't support images)
            const textContent = typeof msg.content === 'string'
              ? msg.content
              : msg.content?.find((p) => p.type === 'text')?.text || ''
            return {
              role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
              content: textContent,
            }
          }),
        stream: true,
      }

      if (request.model.startsWith('glean-agent-')) {
        gleanRequest.agentId = request.model.replace('glean-agent-', '')
      }

      const response = await fetch(`${this.getBaseUrl()}/chat`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(gleanRequest),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new APIError(`Glean API error: ${errorText}`, response.status)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new APIError('No response body')
      }

      const decoder = new TextDecoder()
      let fullContent = ''
      let citations: GleanInternalCitation[] = []

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
              const parsed = JSON.parse(data)
              if (parsed.delta) {
                fullContent += parsed.delta
                yield createDeltaEvent(parsed.delta)
              }
              if (parsed.citations) {
                citations = parsed.citations
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }

      // Append citations
      if (citations.length > 0) {
        const citationText = '\n\n---\n**Sources:**\n' +
          citations.map((c, i) => `${i + 1}. [${c.title}](${c.url})`).join('\n')
        fullContent += citationText
        yield createDeltaEvent(citationText)
      }

      const inputTokens = await this.countTokens(request.messages)
      const outputTokens = Math.ceil(fullContent.length / 4)

      const usage: TokenUsage = {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
      }

      yield createDoneEvent(fullContent, usage, {
        model: request.model,
        provider: 'glean',
        processingTimeMs: Date.now() - startTime,
        finishReason: 'stop',
      })
    } catch (error) {
      const apiError = handleProviderError(error, 'glean')
      yield createErrorEvent(apiError.message)
    }
  }

  // ==========================================================================
  // Glean Agents API (Real API)
  // Reference: https://developers.glean.com/api/client-api/agents/overview
  //
  // NOTE: Agent creation, update, and deletion are NOT supported via API.
  // Agents must be created and configured via the Glean Agent Builder UI.
  // This API only supports listing, reading, and executing agents.
  // ==========================================================================

  /**
   * Search for agents by name
   * Uses POST /rest/api/v1/agents/search
   */
  async searchAgents(request?: GleanAgentSearchRequest): Promise<GleanAgentSearchResponse> {
    try {
      const response = await fetch(
        `${this.getBaseUrl()}/rest/api/v1/agents/search`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            query: request?.query || '',
            pageSize: request?.pageSize || 20,
            cursor: request?.cursor,
          }),
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        throw new APIError(`Failed to search agents: ${errorText}`, response.status)
      }

      return response.json()
    } catch (error) {
      throw handleProviderError(error, 'glean')
    }
  }

  /**
   * Get agent metadata (read-only)
   * Uses GET /rest/api/v1/agents/{agent_id}
   */
  async getAgent(agentId: string): Promise<GleanAgent> {
    try {
      const response = await fetch(
        `${this.getBaseUrl()}/rest/api/v1/agents/${agentId}`,
        {
          headers: this.getHeaders(),
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        throw new APIError(`Failed to get agent: ${errorText}`, response.status)
      }

      return response.json()
    } catch (error) {
      throw handleProviderError(error, 'glean')
    }
  }

  /**
   * Get agent input/output schemas
   * Uses GET /rest/api/v1/agents/{agent_id}/schemas
   */
  async getAgentSchemas(agentId: string): Promise<GleanAgentSchema> {
    try {
      const response = await fetch(
        `${this.getBaseUrl()}/rest/api/v1/agents/${agentId}/schemas`,
        {
          headers: this.getHeaders(),
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        throw new APIError(`Failed to get agent schemas: ${errorText}`, response.status)
      }

      return response.json()
    } catch (error) {
      throw handleProviderError(error, 'glean')
    }
  }

  /**
   * Execute an agent (blocking mode)
   * Uses POST /rest/api/v1/agents/runs/wait
   */
  async runAgentBlocking(request: GleanAgentRunRequest): Promise<GleanAgentRunResponse> {
    try {
      const response = await fetch(
        `${this.getBaseUrl()}/rest/api/v1/agents/runs/wait`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(request),
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        throw new APIError(`Failed to run agent: ${errorText}`, response.status)
      }

      return response.json()
    } catch (error) {
      throw handleProviderError(error, 'glean')
    }
  }

  /**
   * Execute an agent (streaming mode)
   * Uses POST /rest/api/v1/agents/runs/stream
   * Returns an async generator that yields stream events
   */
  async *runAgentStream(
    request: GleanAgentRunRequest
  ): AsyncGenerator<{ type: string; content?: string; citations?: GleanCitation[]; error?: string }> {
    try {
      const response = await fetch(
        `${this.getBaseUrl()}/rest/api/v1/agents/runs/stream`,
        {
          method: 'POST',
          headers: {
            ...this.getHeaders(),
            Accept: 'text/event-stream',
          },
          body: JSON.stringify(request),
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        throw new APIError(`Failed to stream agent run: ${errorText}`, response.status)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new APIError('No response body')
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
            if (data === '[DONE]') {
              yield { type: 'done' }
              continue
            }

            try {
              const parsed = JSON.parse(data)
              yield parsed
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (error) {
      const apiError = handleProviderError(error, 'glean')
      yield { type: 'error', error: apiError.message }
    }
  }

  /**
   * List available data sources
   * Uses GET /api/v1/datasources (standard Glean API)
   */
  async listDataSources(): Promise<GleanDataSource[]> {
    try {
      const response = await fetch(`${this.getBaseUrl()}/api/v1/datasources`, {
        headers: this.getHeaders(),
      })

      if (!response.ok) {
        throw new APIError(`Failed to list data sources: ${response.status}`)
      }

      interface GleanDataSourceResponse {
        datasources: Array<{
          name: string
          displayName: string
          datasourceCategory: string
          isEnabled?: boolean
        }>
      }

      const data: GleanDataSourceResponse = await response.json()

      return data.datasources.map((ds) => ({
        id: ds.name,
        type: this.mapDatasourceCategory(ds.datasourceCategory),
        name: ds.displayName || ds.name,
        isEnabled: ds.isEnabled ?? true,
      }))
    } catch (error) {
      throw handleProviderError(error, 'glean')
    }
  }

  private mapDatasourceCategory(category: string): GleanDataSource['type'] {
    const mapping: Record<string, GleanDataSource['type']> = {
      'content_management': 'confluence',
      'communication': 'slack',
      'code_repository': 'github',
      'project_management': 'jira',
      'file_storage': 'gdrive',
      'documentation': 'notion',
    }
    return mapping[category.toLowerCase()] || 'custom'
  }
}

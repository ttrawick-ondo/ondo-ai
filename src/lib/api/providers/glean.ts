import 'server-only'

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
import type { Citation } from '@/types/chat'
import { BaseProvider } from './base'
import { getModelConfig } from '../config/providers'
import { handleProviderError, ModelNotFoundError, APIError } from '../errors/apiErrors'
import { createStartEvent, createDeltaEvent, createDoneEvent, createErrorEvent } from '../streaming/encoder'
import { parseGleanCitations } from '@/lib/utils/citationParser'

// Glean-native message format
interface GleanChatMessage {
  author: 'USER' | 'GLEAN_AI'
  messageType?: 'CONTENT' | 'UPDATE' | 'CONTEXT' | 'CONTROL' | 'CONTROL_START' | 'CONTROL_FINISH' | 'ERROR'
  fragments?: Array<{ text?: string; citation?: GleanMessageCitation }>
}

interface GleanMessageCitation {
  sourceDocument?: {
    title?: string
    url?: string
    datasource?: string
  }
  referenceRanges?: Array<{ startIndex: number; endIndex: number }>
}

interface GleanChatApiRequest {
  messages: GleanChatMessage[]
  agentId?: string
  stream?: boolean
  saveChat?: boolean
  chatId?: string
}

interface GleanChatApiResponse {
  messages?: GleanChatMessage[]
  chatId?: string
  followUpPrompts?: string[]
  // Deprecated but still populated
  citations?: Array<{
    sourceDocument?: { title?: string; url?: string }
    snippet?: string
  }>
}

export class GleanProvider extends BaseProvider {
  provider = 'glean' as const

  // Cache Glean chatIds by conversationId for multi-turn context
  private chatIdMap = new Map<string, string>()

  private getBaseUrl(): string {
    const url = this.getApiUrl() || 'https://api.glean.com/rest/api/v1'
    // Normalize: strip trailing slash to avoid double-slash in URL construction
    return url.replace(/\/+$/, '')
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

  /**
   * Extract the latest user message in Glean's native format.
   * Glean manages conversation context server-side via chatId,
   * so we only send the newest user message (not the full history).
   */
  private toGleanMessages(messages: ChatCompletionRequest['messages']): GleanChatMessage[] {
    // Find the last user message
    const lastUserMsg = [...messages].reverse().find(
      (msg) => msg.role === 'user'
    )
    if (!lastUserMsg) return []

    const textContent = typeof lastUserMsg.content === 'string'
      ? lastUserMsg.content
      : lastUserMsg.content?.find((p) => p.type === 'text')?.text || ''

    return [{
      author: 'USER' as const,
      messageType: 'CONTENT' as const,
      fragments: [{ text: textContent }],
    }]
  }

  /**
   * Extract text content and rich citation data from a Glean response
   */
  private extractContent(response: GleanChatApiResponse): { content: string; rawCitations: Array<{ title: string; url: string; datasource?: string; snippet?: string }> } {
    let content = ''
    const rawCitations: Array<{ title: string; url: string; datasource?: string; snippet?: string }> = []

    if (response.messages) {
      for (const msg of response.messages) {
        if (msg.author !== 'GLEAN_AI') continue
        if (msg.messageType && msg.messageType !== 'CONTENT') continue
        if (msg.fragments) {
          for (const fragment of msg.fragments) {
            if (fragment.text) {
              content += fragment.text
            }
            if (fragment.citation?.sourceDocument) {
              const doc = fragment.citation.sourceDocument
              if (doc.title && doc.url) {
                rawCitations.push({ title: doc.title, url: doc.url, datasource: doc.datasource })
              }
            }
          }
        }
      }
    }

    // Also check deprecated top-level citations
    if (response.citations) {
      for (const c of response.citations) {
        if (c.sourceDocument?.title && c.sourceDocument?.url) {
          const exists = rawCitations.some((existing) => existing.url === c.sourceDocument!.url)
          if (!exists) {
            rawCitations.push({
              title: c.sourceDocument.title,
              url: c.sourceDocument.url,
              snippet: c.snippet,
            })
          } else if (c.snippet) {
            // Merge snippet into existing citation if missing
            const existing = rawCitations.find((existing) => existing.url === c.sourceDocument!.url)
            if (existing && !existing.snippet) {
              existing.snippet = c.snippet
            }
          }
        }
      }
    }

    return { content, rawCitations }
  }

  /**
   * Convert raw citation data to structured Citation[] objects
   */
  private buildCitations(rawCitations: Array<{ title: string; url: string; datasource?: string; snippet?: string }>): Citation[] {
    return parseGleanCitations(
      rawCitations.map((c) => ({
        title: c.title,
        url: c.url,
        snippet: c.snippet,
        sourceType: c.datasource,
      }))
    )
  }

  async complete(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const startTime = Date.now()
    const model = getModelConfig(request.model)

    if (!model || model.provider !== 'glean') {
      throw new ModelNotFoundError(request.model, 'glean')
    }

    try {
      const gleanRequest: GleanChatApiRequest = {
        messages: this.toGleanMessages(request.messages),
        saveChat: true,
        stream: false,
      }

      // Reuse Glean's chatId for multi-turn conversation context
      const conversationId = request.conversationId || 'default'
      const existingChatId = this.chatIdMap.get(conversationId)
      if (existingChatId) {
        gleanRequest.chatId = existingChatId
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

      const data: GleanChatApiResponse = await response.json()

      // Store chatId for future turns in this conversation
      if (data.chatId) {
        this.chatIdMap.set(conversationId, data.chatId)
      }

      const { content, rawCitations } = this.extractContent(data)
      const structuredCitations = rawCitations.length > 0 ? this.buildCitations(rawCitations) : undefined

      // Estimate tokens (Glean doesn't provide token counts)
      const inputTokens = await this.countTokens(request.messages)
      const outputTokens = Math.ceil(content.length / 4)

      const usage: TokenUsage = {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
      }

      return {
        id: data.chatId || this.generateId(),
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
        ...(structuredCitations && { citations: structuredCitations }),
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
      const gleanRequest: GleanChatApiRequest = {
        messages: this.toGleanMessages(request.messages),
        saveChat: true,
        stream: true,
      }

      // Reuse Glean's chatId for multi-turn conversation context
      const conversationId = request.conversationId || 'default'
      const existingChatId = this.chatIdMap.get(conversationId)
      if (existingChatId) {
        gleanRequest.chatId = existingChatId
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
      const allRawCitations: Array<{ title: string; url: string; datasource?: string; snippet?: string }> = []
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Glean streams newline-delimited JSON (each line is a ChatResponse)
        const lines = buffer.split('\n')
        // Keep the last potentially incomplete line in the buffer
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue

          try {
            const parsed: GleanChatApiResponse = JSON.parse(trimmed)

            // Capture chatId from streamed responses for multi-turn
            if (parsed.chatId) {
              this.chatIdMap.set(conversationId, parsed.chatId)
            }

            const { content: chunkContent, rawCitations } = this.extractContent(parsed)

            if (chunkContent) {
              fullContent += chunkContent
              yield createDeltaEvent(chunkContent)
            }

            for (const c of rawCitations) {
              if (!allRawCitations.some((existing) => existing.url === c.url)) {
                allRawCitations.push(c)
              }
            }
          } catch {
            // Ignore parse errors for incomplete lines
          }
        }
      }

      // Process any remaining buffer
      if (buffer.trim()) {
        try {
          const parsed: GleanChatApiResponse = JSON.parse(buffer.trim())
          if (parsed.chatId) {
            this.chatIdMap.set(conversationId, parsed.chatId)
          }
          const { content: chunkContent, rawCitations } = this.extractContent(parsed)
          if (chunkContent) {
            fullContent += chunkContent
            yield createDeltaEvent(chunkContent)
          }
          for (const c of rawCitations) {
            if (!allRawCitations.some((existing) => existing.url === c.url)) {
              allRawCitations.push(c)
            }
          }
        } catch {
          // Ignore
        }
      }

      // Build structured citations for the UI
      const structuredCitations = allRawCitations.length > 0 ? this.buildCitations(allRawCitations) : undefined

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
      }, structuredCitations)
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
        `${this.getBaseUrl()}/agents/search`,
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
        `${this.getBaseUrl()}/agents/${agentId}`,
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
        `${this.getBaseUrl()}/agents/${agentId}/schemas`,
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
        `${this.getBaseUrl()}/agents/runs/wait`,
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
        `${this.getBaseUrl()}/agents/runs/stream`,
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
      const response = await fetch(`${this.getBaseUrl()}/datasources`, {
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

import 'server-only'

import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  StreamEvent,
  TokenUsage,
} from '@/types'
import { BaseProvider } from './base'
import { getModelConfig } from '../config/providers'
import { handleProviderError, ModelNotFoundError, APIError } from '../errors/apiErrors'
import { createStartEvent, createDeltaEvent, createDoneEvent, createErrorEvent } from '../streaming/encoder'

interface OndoBotRequest {
  messages: Array<{
    role: 'user' | 'assistant' | 'system'
    content: string
  }>
  stream?: boolean
}

interface OndoBotStructuredData {
  type: string
  data: Record<string, unknown>
  summary: string
  pagination?: {
    total: number
    showing: number
    hasMore: boolean
  }
}

interface OndoBotResponse {
  id: string
  response: string
  structured?: OndoBotStructuredData
  metadata?: {
    model?: string
    tokensUsed?: number
    toolUsed?: string
  }
}

export class OndoBotProvider extends BaseProvider {
  provider = 'ondobot' as const

  private getBaseUrl(): string {
    return this.getApiUrl() || 'https://ondobot.internal.company.com/api'
  }

  protected async healthCheck(): Promise<void> {
    const response = await fetch(`${this.getBaseUrl()}/health`, {
      headers: this.getHeaders(),
    })

    if (!response.ok) {
      throw new Error(`OndoBot health check failed: ${response.status}`)
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

    if (!model || model.provider !== 'ondobot') {
      throw new ModelNotFoundError(request.model, 'ondobot')
    }

    try {
      const ondoBotRequest: OndoBotRequest = {
        // Filter out tool messages (not supported by OndoBot)
        messages: request.messages
          .filter((msg) => msg.role !== 'tool')
          .map((msg) => {
            // Extract text content (OndoBot doesn't support images)
            const textContent = typeof msg.content === 'string'
              ? msg.content
              : msg.content?.find((p) => p.type === 'text')?.text || ''
            return {
              role: msg.role as 'user' | 'assistant' | 'system',
              content: textContent,
            }
          }),
        stream: false,
      }

      // Add system prompt if provided
      if (request.options?.systemPrompt) {
        ondoBotRequest.messages.unshift({
          role: 'system',
          content: request.options.systemPrompt,
        })
      }

      const response = await fetch(`${this.getBaseUrl()}/chat`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(ondoBotRequest),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new APIError(`OndoBot API error: ${errorText}`, response.status)
      }

      const data: OndoBotResponse = await response.json()

      // Estimate tokens if not provided
      const inputTokens = await this.countTokens(request.messages)
      const outputTokens = data.metadata?.tokensUsed ?? Math.ceil(data.response.length / 4)

      const usage: TokenUsage = {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
      }

      return {
        id: data.id,
        message: {
          role: 'assistant',
          content: data.response,
        },
        metadata: {
          model: request.model,
          provider: 'ondobot',
          processingTimeMs: Date.now() - startTime,
          finishReason: 'stop',
          // Pass through structured data for rich UI rendering
          ondoBotStructured: data.structured as Record<string, unknown> | undefined,
        },
        usage,
      }
    } catch (error) {
      throw handleProviderError(error, 'ondobot')
    }
  }

  async *stream(request: ChatCompletionRequest): AsyncGenerator<StreamEvent> {
    const startTime = Date.now()
    const model = getModelConfig(request.model)

    if (!model || model.provider !== 'ondobot') {
      throw new ModelNotFoundError(request.model, 'ondobot')
    }

    const id = this.generateId()
    yield createStartEvent(id)

    try {
      const ondoBotRequest: OndoBotRequest = {
        // Filter out tool messages (not supported by OndoBot)
        messages: request.messages
          .filter((msg) => msg.role !== 'tool')
          .map((msg) => {
            // Extract text content (OndoBot doesn't support images)
            const textContent = typeof msg.content === 'string'
              ? msg.content
              : msg.content?.find((p) => p.type === 'text')?.text || ''
            return {
              role: msg.role as 'user' | 'assistant' | 'system',
              content: textContent,
            }
          }),
        stream: true,
      }

      if (request.options?.systemPrompt) {
        ondoBotRequest.messages.unshift({
          role: 'system',
          content: request.options.systemPrompt,
        })
      }

      const response = await fetch(`${this.getBaseUrl()}/chat/stream`, {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          Accept: 'text/event-stream',
        },
        body: JSON.stringify(ondoBotRequest),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new APIError(`OndoBot API error: ${errorText}`, response.status)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new APIError('No response body')
      }

      const decoder = new TextDecoder()
      let fullContent = ''
      let structuredData: OndoBotStructuredData | undefined

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
              // First chunk may contain structured data for rich rendering
              if (parsed.structured) {
                structuredData = parsed.structured
              }
              if (parsed.delta) {
                fullContent += parsed.delta
                yield createDeltaEvent(parsed.delta)
              }
            } catch {
              // Ignore parse errors for non-JSON lines
            }
          }
        }
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
        provider: 'ondobot',
        processingTimeMs: Date.now() - startTime,
        finishReason: 'stop',
        // Pass through structured data for rich UI rendering
        ondoBotStructured: structuredData as Record<string, unknown> | undefined,
      })
    } catch (error) {
      const apiError = handleProviderError(error, 'ondobot')
      yield createErrorEvent(apiError.message)
    }
  }
}

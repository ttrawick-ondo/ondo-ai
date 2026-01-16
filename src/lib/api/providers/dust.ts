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

interface DustConversationRequest {
  message: {
    content: string
    context?: {
      username?: string
      timezone?: string
    }
  }
  blocking?: boolean
}

interface DustConversationResponse {
  conversation: {
    id: string
    messages: Array<{
      id: string
      type: 'user' | 'assistant'
      content: string
    }>
  }
}

export class DustProvider extends BaseProvider {
  provider = 'dust' as const

  private getBaseUrl(): string {
    return this.getApiUrl() || 'https://dust.tt/api/v1'
  }

  protected async healthCheck(): Promise<void> {
    const response = await fetch(`${this.getBaseUrl()}/me`, {
      headers: this.getHeaders(),
    })

    if (!response.ok) {
      throw new Error(`Dust health check failed: ${response.status}`)
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

    if (!model || model.provider !== 'dust') {
      throw new ModelNotFoundError(request.model, 'dust')
    }

    try {
      // Get the last user message (filter out tool messages)
      const lastUserMessage = [...request.messages]
        .reverse()
        .find((m) => m.role === 'user' && m.content)

      if (!lastUserMessage) {
        throw new APIError('No user message provided')
      }

      // Extract text content (Dust doesn't support images)
      const textContent = typeof lastUserMessage.content === 'string'
        ? lastUserMessage.content
        : lastUserMessage.content?.find((p) => p.type === 'text')?.text || ''

      const dustRequest: DustConversationRequest = {
        message: {
          content: textContent,
        },
        blocking: true,
      }

      // Extract workspace ID and assistant ID from model ID if present
      // Format: dust-assistant or dust-{workspaceId}-{assistantId}
      let endpoint = `${this.getBaseUrl()}/conversations`

      if (request.model !== 'dust-assistant') {
        const parts = request.model.split('-')
        if (parts.length >= 3) {
          const workspaceId = parts[1]
          const assistantId = parts.slice(2).join('-')
          endpoint = `${this.getBaseUrl()}/w/${workspaceId}/assistant/conversations`
          dustRequest.message.context = {
            ...dustRequest.message.context,
          }
        }
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(dustRequest),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new APIError(`Dust API error: ${errorText}`, response.status)
      }

      const data: DustConversationResponse = await response.json()

      // Get the last assistant message
      const assistantMessage = [...data.conversation.messages]
        .reverse()
        .find((m) => m.type === 'assistant')

      const content = assistantMessage?.content ?? ''

      // Estimate tokens
      const inputTokens = await this.countTokens(request.messages)
      const outputTokens = Math.ceil(content.length / 4)

      const usage: TokenUsage = {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
      }

      return {
        id: data.conversation.id,
        message: {
          role: 'assistant',
          content,
        },
        metadata: {
          model: request.model,
          provider: 'dust',
          processingTimeMs: Date.now() - startTime,
          finishReason: 'stop',
        },
        usage,
      }
    } catch (error) {
      throw handleProviderError(error, 'dust')
    }
  }

  async *stream(request: ChatCompletionRequest): AsyncGenerator<StreamEvent> {
    const startTime = Date.now()
    const model = getModelConfig(request.model)

    if (!model || model.provider !== 'dust') {
      throw new ModelNotFoundError(request.model, 'dust')
    }

    const id = this.generateId()
    yield createStartEvent(id)

    try {
      // Get the last user message (filter out tool messages)
      const lastUserMessage = [...request.messages]
        .reverse()
        .find((m) => m.role === 'user' && m.content)

      if (!lastUserMessage) {
        throw new APIError('No user message provided')
      }

      // Extract text content (Dust doesn't support images)
      const textContent = typeof lastUserMessage.content === 'string'
        ? lastUserMessage.content
        : lastUserMessage.content?.find((p) => p.type === 'text')?.text || ''

      const dustRequest: DustConversationRequest = {
        message: {
          content: textContent,
        },
        blocking: false,
      }

      let endpoint = `${this.getBaseUrl()}/conversations`

      if (request.model !== 'dust-assistant') {
        const parts = request.model.split('-')
        if (parts.length >= 3) {
          const workspaceId = parts[1]
          endpoint = `${this.getBaseUrl()}/w/${workspaceId}/assistant/conversations`
        }
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          Accept: 'text/event-stream',
        },
        body: JSON.stringify(dustRequest),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new APIError(`Dust API error: ${errorText}`, response.status)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new APIError('No response body')
      }

      const decoder = new TextDecoder()
      let fullContent = ''

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
              if (parsed.type === 'assistant_message' && parsed.content) {
                const delta = parsed.content
                fullContent += delta
                yield createDeltaEvent(delta)
              }
            } catch {
              // Ignore parse errors
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
        provider: 'dust',
        processingTimeMs: Date.now() - startTime,
        finishReason: 'stop',
      })
    } catch (error) {
      const apiError = handleProviderError(error, 'dust')
      yield createErrorEvent(apiError.message)
    }
  }
}

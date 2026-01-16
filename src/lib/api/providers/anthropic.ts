import Anthropic from '@anthropic-ai/sdk'
import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  StreamEvent,
  TokenUsage,
} from '@/types'
import { BaseProvider } from './base'
import { getModelConfig } from '../config/providers'
import { handleProviderError, ModelNotFoundError } from '../errors/apiErrors'
import { createStartEvent, createDeltaEvent, createDoneEvent, createErrorEvent } from '../streaming/encoder'

export class AnthropicProvider extends BaseProvider {
  provider = 'anthropic' as const
  private client: Anthropic | null = null

  private getClient(): Anthropic {
    if (!this.client) {
      this.client = new Anthropic({
        apiKey: this.getApiKey(),
      })
    }
    return this.client
  }

  protected async healthCheck(): Promise<void> {
    // Anthropic doesn't have a dedicated health check endpoint
    // We'll verify the API key is set
    this.getApiKey()
  }

  async complete(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const startTime = Date.now()
    const model = getModelConfig(request.model)

    if (!model || model.provider !== 'anthropic') {
      throw new ModelNotFoundError(request.model, 'anthropic')
    }

    try {
      const client = this.getClient()

      // Build Anthropic message format with file support
      const messages: Anthropic.MessageParam[] = this.buildMessages(request)

      const response = await client.messages.create({
        model: request.model,
        max_tokens: request.options?.maxTokens ?? model.capabilities.maxOutputTokens,
        system: request.options?.systemPrompt,
        messages,
        temperature: request.options?.temperature ?? 0.7,
        top_p: request.options?.topP,
      })

      const content = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('')

      const usage: TokenUsage = {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      }

      usage.estimatedCost = this.calculateCost(usage, model)

      return {
        id: response.id,
        message: {
          role: 'assistant',
          content,
        },
        metadata: {
          model: request.model,
          provider: 'anthropic',
          processingTimeMs: Date.now() - startTime,
          finishReason: this.mapFinishReason(response.stop_reason),
        },
        usage,
      }
    } catch (error) {
      throw handleProviderError(error, 'anthropic')
    }
  }

  async *stream(request: ChatCompletionRequest): AsyncGenerator<StreamEvent> {
    const startTime = Date.now()
    const model = getModelConfig(request.model)

    if (!model || model.provider !== 'anthropic') {
      throw new ModelNotFoundError(request.model, 'anthropic')
    }

    const id = this.generateId()
    yield createStartEvent(id)

    try {
      const client = this.getClient()

      // Build Anthropic message format with file support
      const messages: Anthropic.MessageParam[] = this.buildMessages(request)

      const stream = await client.messages.stream({
        model: request.model,
        max_tokens: request.options?.maxTokens ?? model.capabilities.maxOutputTokens,
        system: request.options?.systemPrompt,
        messages,
        temperature: request.options?.temperature ?? 0.7,
        top_p: request.options?.topP,
      })

      let fullContent = ''
      let usage: TokenUsage = {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
      }
      let finishReason: ChatCompletionResponse['metadata']['finishReason'] = 'stop'

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          const delta = event.delta.text
          fullContent += delta
          yield createDeltaEvent(delta)
        }

        if (event.type === 'message_delta' && event.delta.stop_reason) {
          finishReason = this.mapFinishReason(event.delta.stop_reason)
        }

        if (event.type === 'message_delta' && event.usage) {
          usage.outputTokens = event.usage.output_tokens
        }

        if (event.type === 'message_start' && event.message.usage) {
          usage.inputTokens = event.message.usage.input_tokens
        }
      }

      usage.totalTokens = usage.inputTokens + usage.outputTokens
      usage.estimatedCost = this.calculateCost(usage, model)

      yield createDoneEvent(fullContent, usage, {
        model: request.model,
        provider: 'anthropic',
        processingTimeMs: Date.now() - startTime,
        finishReason,
      })
    } catch (error) {
      const apiError = handleProviderError(error, 'anthropic')
      yield createErrorEvent(apiError.message)
    }
  }

  private buildMessages(
    request: ChatCompletionRequest
  ): Anthropic.MessageParam[] {
    return request.messages
      .filter((msg) => msg.role !== 'tool')
      .map((msg) => {
        // Handle messages with images or files
        if (msg.role === 'user' && (msg.images?.length || msg.files?.length)) {
          const contentBlocks: Anthropic.ContentBlockParam[] = []

          // Add text content first if present
          let textContent = typeof msg.content === 'string' ? msg.content : ''

          // Append file contents
          if (msg.files && msg.files.length > 0) {
            const fileContents = msg.files
              .filter((f) => f.content && f.status === 'ready')
              .map((f) => {
                if (f.fileType === 'code' && f.language) {
                  return `\n\n--- File: ${f.name} ---\n\`\`\`${f.language}\n${f.content}\n\`\`\``
                }
                return `\n\n--- File: ${f.name} ---\n${f.content}`
              })
              .join('\n')

            if (fileContents) {
              textContent = textContent + fileContents
            }
          }

          if (textContent) {
            contentBlocks.push({
              type: 'text',
              text: textContent,
            })
          }

          // Add images
          if (msg.images) {
            for (const image of msg.images) {
              // Extract base64 data and media type
              const base64Match = image.base64?.match(/^data:([^;]+);base64,(.+)$/)
              if (base64Match) {
                const mediaType = base64Match[1] as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
                const data = base64Match[2]
                contentBlocks.push({
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: mediaType,
                    data,
                  },
                })
              }
            }
          }

          return {
            role: 'user' as const,
            content: contentBlocks.length > 0 ? contentBlocks : '',
          }
        }

        // Handle array content (already multi-modal)
        if (Array.isArray(msg.content)) {
          const contentBlocks: Anthropic.ContentBlockParam[] = msg.content.map((part) => {
            if (part.type === 'text') {
              return { type: 'text' as const, text: part.text }
            } else {
              // Convert image_url to Anthropic format
              const base64Match = part.image_url.url.match(/^data:([^;]+);base64,(.+)$/)
              if (base64Match) {
                return {
                  type: 'image' as const,
                  source: {
                    type: 'base64' as const,
                    media_type: base64Match[1] as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                    data: base64Match[2],
                  },
                }
              }
              // Fallback - just use text
              return { type: 'text' as const, text: '[Image]' }
            }
          })
          return {
            role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
            content: contentBlocks,
          }
        }

        // Regular text message - also handle file attachments
        let content = (typeof msg.content === 'string' ? msg.content : '') || ''

        if (msg.role === 'user' && msg.files && msg.files.length > 0) {
          const fileContents = msg.files
            .filter((f) => f.content && f.status === 'ready')
            .map((f) => {
              if (f.fileType === 'code' && f.language) {
                return `\n\n--- File: ${f.name} ---\n\`\`\`${f.language}\n${f.content}\n\`\`\``
              }
              return `\n\n--- File: ${f.name} ---\n${f.content}`
            })
            .join('\n')

          if (fileContents) {
            content = content + fileContents
          }
        }

        return {
          role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
          content,
        }
      })
  }

  private mapFinishReason(
    reason: string | null | undefined
  ): ChatCompletionResponse['metadata']['finishReason'] {
    switch (reason) {
      case 'end_turn':
        return 'stop'
      case 'max_tokens':
        return 'length'
      case 'stop_sequence':
        return 'stop'
      default:
        return 'stop'
    }
  }
}

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

      const messages: Anthropic.MessageParam[] = request.messages.map((msg) => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      }))

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

      const messages: Anthropic.MessageParam[] = request.messages.map((msg) => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      }))

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

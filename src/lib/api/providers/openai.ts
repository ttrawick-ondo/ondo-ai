import OpenAI from 'openai'
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

export class OpenAIProvider extends BaseProvider {
  provider = 'openai' as const
  private client: OpenAI | null = null

  private getClient(): OpenAI {
    if (!this.client) {
      this.client = new OpenAI({
        apiKey: this.getApiKey(),
      })
    }
    return this.client
  }

  protected async healthCheck(): Promise<void> {
    const client = this.getClient()
    await client.models.list()
  }

  async complete(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const startTime = Date.now()
    const model = getModelConfig(request.model)

    if (!model || model.provider !== 'openai') {
      throw new ModelNotFoundError(request.model, 'openai')
    }

    try {
      const client = this.getClient()

      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = []

      if (request.options?.systemPrompt) {
        messages.push({
          role: 'system',
          content: request.options.systemPrompt,
        })
      }

      messages.push(
        ...request.messages.map((msg) => ({
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content,
        }))
      )

      const response = await client.chat.completions.create({
        model: request.model,
        messages,
        temperature: request.options?.temperature ?? 0.7,
        max_tokens: request.options?.maxTokens ?? model.capabilities.maxOutputTokens,
        top_p: request.options?.topP,
      })

      const usage: TokenUsage = {
        inputTokens: response.usage?.prompt_tokens ?? 0,
        outputTokens: response.usage?.completion_tokens ?? 0,
        totalTokens: response.usage?.total_tokens ?? 0,
      }

      usage.estimatedCost = this.calculateCost(usage, model)

      return {
        id: response.id,
        message: {
          role: 'assistant',
          content: response.choices[0]?.message?.content ?? '',
        },
        metadata: {
          model: request.model,
          provider: 'openai',
          processingTimeMs: Date.now() - startTime,
          finishReason: this.mapFinishReason(response.choices[0]?.finish_reason),
        },
        usage,
      }
    } catch (error) {
      throw handleProviderError(error, 'openai')
    }
  }

  async *stream(request: ChatCompletionRequest): AsyncGenerator<StreamEvent> {
    const startTime = Date.now()
    const model = getModelConfig(request.model)

    if (!model || model.provider !== 'openai') {
      throw new ModelNotFoundError(request.model, 'openai')
    }

    const id = this.generateId()
    yield createStartEvent(id)

    try {
      const client = this.getClient()

      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = []

      if (request.options?.systemPrompt) {
        messages.push({
          role: 'system',
          content: request.options.systemPrompt,
        })
      }

      messages.push(
        ...request.messages.map((msg) => ({
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content,
        }))
      )

      const stream = await client.chat.completions.create({
        model: request.model,
        messages,
        temperature: request.options?.temperature ?? 0.7,
        max_tokens: request.options?.maxTokens ?? model.capabilities.maxOutputTokens,
        top_p: request.options?.topP,
        stream: true,
        stream_options: { include_usage: true },
      })

      let fullContent = ''
      let usage: TokenUsage = {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
      }
      let finishReason: ChatCompletionResponse['metadata']['finishReason'] = 'stop'

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content ?? ''

        if (delta) {
          fullContent += delta
          yield createDeltaEvent(delta)
        }

        if (chunk.choices[0]?.finish_reason) {
          finishReason = this.mapFinishReason(chunk.choices[0].finish_reason)
        }

        if (chunk.usage) {
          usage = {
            inputTokens: chunk.usage.prompt_tokens,
            outputTokens: chunk.usage.completion_tokens,
            totalTokens: chunk.usage.total_tokens,
          }
        }
      }

      usage.estimatedCost = this.calculateCost(usage, model)

      yield createDoneEvent(fullContent, usage, {
        model: request.model,
        provider: 'openai',
        processingTimeMs: Date.now() - startTime,
        finishReason,
      })
    } catch (error) {
      const apiError = handleProviderError(error, 'openai')
      yield createErrorEvent(apiError.message)
    }
  }

  private mapFinishReason(
    reason: string | null | undefined
  ): ChatCompletionResponse['metadata']['finishReason'] {
    switch (reason) {
      case 'stop':
        return 'stop'
      case 'length':
        return 'length'
      case 'content_filter':
        return 'content_filter'
      default:
        return 'stop'
    }
  }
}

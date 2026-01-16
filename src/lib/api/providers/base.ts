import type {
  AIProvider,
  ModelConfig,
  ProviderStatus,
  ChatCompletionRequest,
  ChatCompletionResponse,
  StreamEvent,
  TokenUsage,
} from '@/types'
import {
  getModelsByProvider,
  isProviderConfigured,
  getProviderApiKey,
  getProviderApiUrl,
} from '../config/providers'
import { ProviderNotConfiguredError } from '../errors/apiErrors'

export interface AIProviderInterface {
  provider: AIProvider
  isConfigured(): boolean
  getStatus(): Promise<ProviderStatus>
  getModels(): ModelConfig[]
  complete(request: ChatCompletionRequest): Promise<ChatCompletionResponse>
  stream(request: ChatCompletionRequest): AsyncGenerator<StreamEvent>
  countTokens(messages: ChatCompletionRequest['messages']): Promise<number>
}

export abstract class BaseProvider implements AIProviderInterface {
  abstract provider: AIProvider

  isConfigured(): boolean {
    return isProviderConfigured(this.provider)
  }

  protected getApiKey(): string {
    const key = getProviderApiKey(this.provider)
    if (!key) {
      throw new ProviderNotConfiguredError(this.provider)
    }
    return key
  }

  protected getApiUrl(): string | undefined {
    return getProviderApiUrl(this.provider)
  }

  async getStatus(): Promise<ProviderStatus> {
    const isConfigured = this.isConfigured()

    if (!isConfigured) {
      return {
        provider: this.provider,
        isConfigured: false,
        isHealthy: false,
        errorMessage: 'API key not configured',
      }
    }

    try {
      await this.healthCheck()
      return {
        provider: this.provider,
        isConfigured: true,
        isHealthy: true,
      }
    } catch (error) {
      return {
        provider: this.provider,
        isConfigured: true,
        isHealthy: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  getModels(): ModelConfig[] {
    return getModelsByProvider(this.provider)
  }

  abstract complete(request: ChatCompletionRequest): Promise<ChatCompletionResponse>
  abstract stream(request: ChatCompletionRequest): AsyncGenerator<StreamEvent>

  async countTokens(messages: ChatCompletionRequest['messages']): Promise<number> {
    // Default implementation: estimate ~4 chars per token
    const totalChars = messages.reduce((sum, msg) => sum + msg.content.length, 0)
    return Math.ceil(totalChars / 4)
  }

  protected abstract healthCheck(): Promise<void>

  protected generateId(): string {
    return `${this.provider}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  }

  protected calculateCost(usage: TokenUsage, model: ModelConfig): number | undefined {
    if (!model.pricing) return undefined

    const inputCost = (usage.inputTokens / 1_000_000) * model.pricing.inputPer1M
    const outputCost = (usage.outputTokens / 1_000_000) * model.pricing.outputPer1M

    return inputCost + outputCost
  }
}

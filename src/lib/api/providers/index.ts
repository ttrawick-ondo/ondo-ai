import type { AIProvider, ProviderInfo, ModelConfig } from '@/types'
import { AIProviderInterface, BaseProvider } from './base'
import { OpenAIProvider } from './openai'
import { AnthropicProvider } from './anthropic'
import { GleanProvider } from './glean'
import { DustProvider } from './dust'
import { OndoBotProvider } from './ondobot'
import {
  providerInfo,
  modelConfigs,
  isProviderEnabled,
  isProviderConfigured,
  getModelConfig,
} from '../config/providers'
import { ProviderNotFoundError } from '../errors/apiErrors'

// Provider registry
const providerRegistry: Record<AIProvider, new () => BaseProvider> = {
  openai: OpenAIProvider,
  anthropic: AnthropicProvider,
  glean: GleanProvider,
  dust: DustProvider,
  ondobot: OndoBotProvider,
}

// Provider instance cache
const providerInstances: Partial<Record<AIProvider, BaseProvider>> = {}

export function getProvider(provider: AIProvider): AIProviderInterface {
  if (!providerRegistry[provider]) {
    throw new ProviderNotFoundError(provider)
  }

  if (!providerInstances[provider]) {
    const ProviderClass = providerRegistry[provider]
    providerInstances[provider] = new ProviderClass()
  }

  return providerInstances[provider]!
}

export function getProviderForModel(modelId: string): AIProviderInterface {
  const model = getModelConfig(modelId)

  if (!model) {
    // Check if it's a Glean agent model
    if (modelId.startsWith('glean-agent-')) {
      return getProvider('glean')
    }
    // Check if it's a Dust workspace model
    if (modelId.startsWith('dust-')) {
      return getProvider('dust')
    }
    throw new ProviderNotFoundError(modelId)
  }

  return getProvider(model.provider)
}

export function getAllProviders(): ProviderInfo[] {
  const providers: AIProvider[] = ['openai', 'anthropic', 'glean', 'dust', 'ondobot']

  return providers.map((provider) => ({
    ...providerInfo[provider],
    isConfigured: isProviderConfigured(provider),
    isEnabled: isProviderEnabled(provider),
  }))
}

export function getEnabledModels(): ModelConfig[] {
  return modelConfigs.filter((model) => {
    return model.isEnabled && isProviderEnabled(model.provider) && isProviderConfigured(model.provider)
  })
}

export function getConfiguredProviders(): AIProvider[] {
  const providers: AIProvider[] = ['openai', 'anthropic', 'glean', 'dust', 'ondobot']
  return providers.filter((p) => isProviderConfigured(p) && isProviderEnabled(p))
}

// Re-export types and providers
export type { AIProviderInterface }
export { BaseProvider }
export { OpenAIProvider } from './openai'
export { AnthropicProvider } from './anthropic'
export { GleanProvider } from './glean'
export { DustProvider } from './dust'
export { OndoBotProvider } from './ondobot'

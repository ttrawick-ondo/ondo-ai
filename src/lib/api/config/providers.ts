import type { AIProvider, ModelConfig, ProviderInfo } from '@/types'

// Provider information
export const providerInfo: Record<AIProvider, Omit<ProviderInfo, 'isConfigured' | 'isEnabled'>> = {
  openai: {
    provider: 'openai',
    name: 'OpenAI',
    description: 'GPT-4, GPT-4o, and GPT-3.5 Turbo models',
  },
  anthropic: {
    provider: 'anthropic',
    name: 'Anthropic',
    description: 'Claude 3.5, Claude 3 Opus, Sonnet, and Haiku models',
  },
  glean: {
    provider: 'glean',
    name: 'Glean',
    description: 'Enterprise search and knowledge assistant with custom agents',
  },
  dust: {
    provider: 'dust',
    name: 'Dust',
    description: 'AI assistants with workspace context',
  },
  ondobot: {
    provider: 'ondobot',
    name: 'OndoBot',
    description: 'Internal Ondo AI assistant',
  },
}

// Model configurations
export const modelConfigs: ModelConfig[] = [
  // OpenAI models
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'openai',
    description: 'Most capable GPT-4 model, optimized for speed',
    capabilities: {
      streaming: true,
      vision: true,
      files: true,
      functionCalling: true,
      maxInputTokens: 128000,
      maxOutputTokens: 4096,
    },
    pricing: {
      inputPer1M: 10,
      outputPer1M: 30,
    },
    isEnabled: true,
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    description: 'Multimodal model with vision and audio capabilities',
    capabilities: {
      streaming: true,
      vision: true,
      files: true,
      functionCalling: true,
      maxInputTokens: 128000,
      maxOutputTokens: 4096,
    },
    pricing: {
      inputPer1M: 5,
      outputPer1M: 15,
    },
    isEnabled: true,
    isDefault: true,
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    description: 'Smaller, faster, and more affordable GPT-4o',
    capabilities: {
      streaming: true,
      vision: true,
      files: true,
      functionCalling: true,
      maxInputTokens: 128000,
      maxOutputTokens: 16384,
    },
    pricing: {
      inputPer1M: 0.15,
      outputPer1M: 0.6,
    },
    isEnabled: true,
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'openai',
    description: 'Fast and cost-effective for simpler tasks',
    capabilities: {
      streaming: true,
      vision: false,
      files: false,
      functionCalling: true,
      maxInputTokens: 16385,
      maxOutputTokens: 4096,
    },
    pricing: {
      inputPer1M: 0.5,
      outputPer1M: 1.5,
    },
    isEnabled: true,
  },
  // Anthropic models
  {
    id: 'claude-sonnet-4-20250514',
    name: 'Claude Sonnet 4',
    provider: 'anthropic',
    description: 'Best balance of intelligence and speed',
    capabilities: {
      streaming: true,
      vision: true,
      files: true,
      functionCalling: true,
      maxInputTokens: 200000,
      maxOutputTokens: 16384,
    },
    pricing: {
      inputPer1M: 3,
      outputPer1M: 15,
    },
    isEnabled: true,
    isDefault: true,
  },
  {
    id: 'claude-opus-4-20250514',
    name: 'Claude Opus 4',
    provider: 'anthropic',
    description: 'Most powerful Claude model for complex tasks',
    capabilities: {
      streaming: true,
      vision: true,
      files: true,
      functionCalling: true,
      maxInputTokens: 200000,
      maxOutputTokens: 16384,
    },
    pricing: {
      inputPer1M: 15,
      outputPer1M: 75,
    },
    isEnabled: true,
  },
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    provider: 'anthropic',
    description: 'Fastest and most cost-effective Claude model',
    capabilities: {
      streaming: true,
      vision: true,
      files: true,
      functionCalling: true,
      maxInputTokens: 200000,
      maxOutputTokens: 8192,
    },
    pricing: {
      inputPer1M: 0.8,
      outputPer1M: 4,
    },
    isEnabled: true,
  },
  // Glean model
  {
    id: 'glean-assistant',
    name: 'Glean Assistant',
    provider: 'glean',
    description: 'Enterprise knowledge assistant with company context',
    capabilities: {
      streaming: true,
      vision: false,
      files: true,
      functionCalling: false,
      maxInputTokens: 32000,
      maxOutputTokens: 4096,
    },
    isEnabled: true,
  },
  // Dust model
  {
    id: 'dust-assistant',
    name: 'Dust Assistant',
    provider: 'dust',
    description: 'AI assistant with workspace integrations',
    capabilities: {
      streaming: true,
      vision: false,
      files: true,
      functionCalling: false,
      maxInputTokens: 32000,
      maxOutputTokens: 4096,
    },
    isEnabled: true,
  },
  // OndoBot model
  {
    id: 'ondobot-assistant',
    name: 'OndoBot',
    provider: 'ondobot',
    description: 'Internal Ondo AI assistant',
    capabilities: {
      streaming: true,
      vision: false,
      files: false,
      functionCalling: false,
      maxInputTokens: 16000,
      maxOutputTokens: 4096,
    },
    isEnabled: true,
  },
]

// Environment variable mapping
export const providerEnvVars: Record<AIProvider, { apiKey: string; apiUrl?: string; enableFlag: string }> = {
  openai: {
    apiKey: 'OPENAI_API_KEY',
    enableFlag: 'ENABLE_OPENAI',
  },
  anthropic: {
    apiKey: 'ANTHROPIC_API_KEY',
    enableFlag: 'ENABLE_ANTHROPIC',
  },
  glean: {
    apiKey: 'GLEAN_API_KEY',
    apiUrl: 'GLEAN_API_URL',
    enableFlag: 'ENABLE_GLEAN',
  },
  dust: {
    apiKey: 'DUST_API_KEY',
    apiUrl: 'DUST_API_URL',
    enableFlag: 'ENABLE_DUST',
  },
  ondobot: {
    apiKey: 'ONDOBOT_API_KEY',
    apiUrl: 'ONDOBOT_API_URL',
    enableFlag: 'ENABLE_ONDOBOT',
  },
}

// Helper functions
export function getModelConfig(modelId: string): ModelConfig | undefined {
  return modelConfigs.find((m) => m.id === modelId)
}

export function getModelsByProvider(provider: AIProvider): ModelConfig[] {
  return modelConfigs.filter((m) => m.provider === provider && m.isEnabled)
}

export function getDefaultModelForProvider(provider: AIProvider): ModelConfig | undefined {
  const providerModels = getModelsByProvider(provider)
  return providerModels.find((m) => m.isDefault) || providerModels[0]
}

export function isProviderEnabled(provider: AIProvider): boolean {
  const envVar = providerEnvVars[provider].enableFlag
  const value = process.env[envVar]
  return value === undefined || value === 'true'
}

export function isProviderConfigured(provider: AIProvider): boolean {
  const { apiKey } = providerEnvVars[provider]
  return !!process.env[apiKey]
}

export function getProviderApiKey(provider: AIProvider): string | undefined {
  return process.env[providerEnvVars[provider].apiKey]
}

export function getProviderApiUrl(provider: AIProvider): string | undefined {
  const urlVar = providerEnvVars[provider].apiUrl
  return urlVar ? process.env[urlVar] : undefined
}

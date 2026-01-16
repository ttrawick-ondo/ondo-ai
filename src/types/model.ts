// AI Provider types
export type AIProvider = 'openai' | 'anthropic' | 'glean' | 'dust' | 'ondobot'

// Model capabilities
export interface ModelCapabilities {
  streaming: boolean
  vision: boolean
  files: boolean
  functionCalling: boolean
  maxInputTokens: number
  maxOutputTokens: number
}

// Model pricing per 1M tokens
export interface ModelPricing {
  inputPer1M: number
  outputPer1M: number
}

// Model configuration
export interface ModelConfig {
  id: string
  name: string
  provider: AIProvider
  description?: string
  capabilities: ModelCapabilities
  pricing?: ModelPricing
  isEnabled: boolean
  isDefault?: boolean
}

// Provider status
export interface ProviderStatus {
  provider: AIProvider
  isConfigured: boolean
  isHealthy: boolean
  errorMessage?: string
}

// Glean-specific types
export interface GleanDataSource {
  id: string
  type: 'confluence' | 'slack' | 'github' | 'jira' | 'gdrive' | 'notion' | 'custom'
  name: string
  description?: string
  isEnabled: boolean
}

export interface GleanAgentConfig {
  id: string
  name: string
  description?: string
  systemPrompt: string
  dataSources: GleanDataSource[]
  temperature: number
  workspaceId: string
  createdAt: Date
  updatedAt: Date
}

export interface CreateGleanAgentInput {
  name: string
  description?: string
  systemPrompt: string
  dataSourceIds: string[]
  temperature?: number
}

export interface UpdateGleanAgentInput {
  name?: string
  description?: string
  systemPrompt?: string
  dataSourceIds?: string[]
  temperature?: number
}

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

// Agent Testing Types
export interface AgentTestQuery {
  id: string
  query: string
  timestamp: Date
}

export interface AgentTestResult {
  id: string
  query: string
  response: string
  citations?: GleanCitation[]
  processingTimeMs: number
  timestamp: Date
  error?: string
}

export interface GleanCitation {
  id: string
  title: string
  url: string
  snippet: string
  source: string
  sourceType: GleanDataSource['type']
}

export interface AgentTestSession {
  id: string
  agentConfig: AgentPreviewConfig
  results: AgentTestResult[]
  createdAt: Date
}

export interface AgentPreviewConfig {
  name: string
  description?: string
  systemPrompt: string
  dataSourceIds: string[]
  temperature: number
  // For distinguishing draft from saved
  savedAgentId?: string
  isDraft: boolean
}

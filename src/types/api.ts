import type { AIProvider, ModelConfig } from './model'
import type { Message, MessageRole } from './chat'

// Chat completion request
export interface ChatCompletionRequest {
  conversationId: string
  messages: ChatCompletionMessage[]
  provider: AIProvider
  model: string
  options?: ChatCompletionOptions
}

export interface ChatCompletionMessage {
  role: MessageRole
  content: string
  name?: string
}

export interface ChatCompletionOptions {
  temperature?: number
  maxTokens?: number
  topP?: number
  stream?: boolean
  systemPrompt?: string
}

// Chat completion response
export interface ChatCompletionResponse {
  id: string
  message: {
    role: 'assistant'
    content: string
  }
  metadata: ChatCompletionMetadata
  usage: TokenUsage
}

export interface ChatCompletionMetadata {
  model: string
  provider: AIProvider
  processingTimeMs: number
  finishReason: 'stop' | 'length' | 'content_filter' | 'error'
}

// Token usage tracking
export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  totalTokens: number
  estimatedCost?: number
}

// Streaming events
export type StreamEventType =
  | 'start'
  | 'delta'
  | 'done'
  | 'error'

export interface StreamEvent {
  type: StreamEventType
  data: StreamEventData
  timestamp: number
}

export interface StreamEventData {
  id?: string
  delta?: string
  content?: string
  usage?: TokenUsage
  error?: string
  metadata?: ChatCompletionMetadata
}

// Provider list response
export interface ProvidersResponse {
  providers: ProviderInfo[]
  models: ModelConfig[]
}

export interface ProviderInfo {
  provider: AIProvider
  name: string
  description: string
  isConfigured: boolean
  isEnabled: boolean
}

// Stream callbacks for frontend
export interface StreamCallbacks {
  onStart?: () => void
  onDelta?: (delta: string) => void
  onDone?: (response: ChatCompletionResponse) => void
  onError?: (error: string) => void
}

import type { AIProvider, ModelConfig } from './model'
import type { Message, MessageRole, ContentPart, ImageAttachment, FileAttachment } from './chat'
import type { ToolAPIFormat, ToolCall } from './tools'

// Chat completion request
export interface ChatCompletionRequest {
  conversationId: string
  messages: ChatCompletionMessage[]
  provider: AIProvider
  model: string
  options?: ChatCompletionOptions
}

export interface ChatCompletionMessage {
  role: MessageRole | 'tool'
  content: string | ContentPart[] // String for text-only, array for multi-modal
  name?: string
  // For assistant messages that include tool calls
  tool_calls?: ToolCall[]
  // For tool response messages
  tool_call_id?: string
  // Image attachments (will be converted to content parts)
  images?: ImageAttachment[]
  // File attachments (content will be added to context)
  files?: FileAttachment[]
}

export interface ChatCompletionOptions {
  temperature?: number
  maxTokens?: number
  topP?: number
  stream?: boolean
  systemPrompt?: string
  // Tool-related options
  tools?: ToolAPIFormat[]
  tool_choice?: 'auto' | 'none' | 'required' | { type: 'function'; function: { name: string } }
  parallel_tool_calls?: boolean
}

// Chat completion response
export interface ChatCompletionResponse {
  id: string
  message: {
    role: 'assistant'
    content: string | null
    tool_calls?: ToolCall[]
  }
  metadata: ChatCompletionMetadata
  usage: TokenUsage
}

export interface ChatCompletionMetadata {
  model: string
  provider: AIProvider
  processingTimeMs: number
  finishReason: 'stop' | 'length' | 'content_filter' | 'error' | 'tool_calls'
  // OndoBot structured result data for rich UI rendering
  ondoBotStructured?: Record<string, unknown>
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
  // Tool call streaming support
  tool_calls?: ToolCall[]
  tool_call_delta?: {
    index: number
    id?: string
    type?: 'function'
    function?: {
      name?: string
      arguments?: string
    }
  }
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
  onToolCallDelta?: (delta: StreamEventData['tool_call_delta']) => void
  onDone?: (response: ChatCompletionResponse) => void
  onError?: (error: string) => void
}

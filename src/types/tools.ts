/**
 * Tool/Function Calling Types for OpenAI Integration
 */

// JSON Schema types for function parameters
export interface JSONSchemaProperty {
  type: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object'
  description?: string
  enum?: string[]
  items?: JSONSchemaProperty
  properties?: Record<string, JSONSchemaProperty>
  required?: string[]
  default?: unknown
}

export interface FunctionParameters {
  type: 'object'
  properties: Record<string, JSONSchemaProperty>
  required?: string[]
  additionalProperties?: boolean
  // Index signature to satisfy OpenAI SDK compatibility
  [key: string]: unknown
}

// Tool Definition (how tools are registered)
export interface ToolDefinition {
  name: string
  description: string
  parameters: FunctionParameters
  handler: (args: Record<string, unknown>) => Promise<ToolResult>
}

// Tool in API format (for sending to OpenAI)
export interface ToolAPIFormat {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: FunctionParameters
  }
}

// Tool Call from AI response
export interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string // JSON string
  }
}

// Parsed tool call with typed arguments
export interface ParsedToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
}

// Result of executing a tool
export interface ToolResult {
  success: boolean
  output: string
  error?: string
  metadata?: Record<string, unknown>
}

// Tool execution record (for display and logging)
export interface ToolExecutionRecord {
  id: string
  toolName: string
  arguments: Record<string, unknown>
  result: ToolResult
  startedAt: number
  completedAt: number
  duration: number
}

// Message with tool calls
export interface ToolCallMessage {
  role: 'assistant'
  content: string | null
  tool_calls: ToolCall[]
}

// Tool result message
export interface ToolResultMessage {
  role: 'tool'
  tool_call_id: string
  content: string
}

// Tool choice configuration
export type ToolChoice =
  | 'auto'
  | 'none'
  | 'required'
  | { type: 'function'; function: { name: string } }

// Options for tool execution
export interface ToolExecutionOptions {
  timeout?: number
  maxRetries?: number
  parallel?: boolean
}

// Tool registry state
export interface ToolRegistryState {
  tools: Map<string, ToolDefinition>
  enabled: Set<string>
}

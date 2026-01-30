/**
 * Agnostic Agent Framework Types
 *
 * This framework abstracts agent capabilities across different providers:
 * - OpenAI (Assistants API - full CRUD)
 * - Anthropic (stateless - client manages config)
 * - Glean (read-only - created in UI)
 * - Dust (read-only - created in UI)
 *
 * The framework normalizes:
 * - Agent definition and configuration
 * - Conversation/thread management
 * - Tool execution
 * - Streaming responses
 */

// =============================================================================
// Core Agent Types
// =============================================================================

/**
 * Supported agent providers
 */
export type AgentProvider = 'openai' | 'anthropic' | 'glean' | 'dust' | 'local'

/**
 * Provider capabilities - what each provider supports
 */
export interface ProviderCapabilities {
  /** Can create agents via API */
  createAgent: boolean
  /** Can update agents via API */
  updateAgent: boolean
  /** Can delete agents via API */
  deleteAgent: boolean
  /** Supports server-side conversation threads */
  serverThreads: boolean
  /** Supports tool/function calling */
  toolCalling: boolean
  /** Has built-in code execution */
  codeExecution: boolean
  /** Has built-in file/RAG search */
  fileSearch: boolean
  /** Supports response streaming */
  streaming: boolean
  /** Maximum tools per agent */
  maxTools: number | 'unlimited'
}

/**
 * Provider capabilities matrix
 */
export const PROVIDER_CAPABILITIES: Record<AgentProvider, ProviderCapabilities> = {
  openai: {
    createAgent: true,
    updateAgent: true,
    deleteAgent: true,
    serverThreads: true,
    toolCalling: true,
    codeExecution: true,
    fileSearch: true,
    streaming: true,
    maxTools: 128,
  },
  anthropic: {
    createAgent: false, // Stateless API - config sent per request
    updateAgent: false,
    deleteAgent: false,
    serverThreads: false, // Client manages conversation state
    toolCalling: true,
    codeExecution: false, // Must implement via tools
    fileSearch: false, // Must implement via tools
    streaming: true,
    maxTools: 'unlimited',
  },
  glean: {
    createAgent: false, // UI only
    updateAgent: false,
    deleteAgent: false,
    serverThreads: true, // Implicit via runs
    toolCalling: false, // Limited to search
    codeExecution: false,
    fileSearch: true, // Enterprise search
    streaming: true,
    maxTools: 0,
  },
  dust: {
    createAgent: false, // UI only
    updateAgent: false, // Only userFavorite writable
    deleteAgent: false,
    serverThreads: true,
    toolCalling: true, // Actions
    codeExecution: false,
    fileSearch: true,
    streaming: true,
    maxTools: 'unlimited',
  },
  local: {
    createAgent: true, // Stored in our database
    updateAgent: true,
    deleteAgent: true,
    serverThreads: true, // We manage threads
    toolCalling: true,
    codeExecution: false, // Depends on tools
    fileSearch: false, // Depends on tools
    streaming: true,
    maxTools: 'unlimited',
  },
}

// =============================================================================
// Agent Configuration
// =============================================================================

/**
 * Unified agent configuration that works across all providers
 */
export interface AgentConfig {
  /** Unique identifier */
  id: string

  /** Human-readable name */
  name: string

  /** Description of what this agent does */
  description?: string

  /** System prompt / instructions */
  instructions: string

  /** Model to use (provider-specific format) */
  model: string

  /** Which provider hosts this agent */
  provider: AgentProvider

  /** Provider-specific agent ID (for Glean/Dust/OpenAI) */
  externalId?: string

  /** Model parameters */
  parameters?: AgentParameters

  /** Tools available to this agent */
  tools?: AgentTool[]

  /** Data sources / knowledge bases */
  dataSources?: AgentDataSource[]

  /** Custom metadata */
  metadata?: Record<string, unknown>

  /** Timestamps */
  createdAt: Date
  updatedAt: Date
}

export interface AgentParameters {
  temperature?: number
  maxTokens?: number
  topP?: number
  topK?: number
  stopSequences?: string[]
}

export interface AgentTool {
  /** Tool identifier */
  name: string

  /** Human-readable description */
  description: string

  /** Tool type */
  type: 'function' | 'code_interpreter' | 'file_search' | 'retrieval'

  /** JSON Schema for function parameters */
  parameters?: Record<string, unknown>

  /** Provider-specific configuration */
  providerConfig?: Record<string, unknown>
}

export interface AgentDataSource {
  /** Data source identifier */
  id: string

  /** Type of data source */
  type: 'file' | 'vector_store' | 'knowledge_base' | 'api'

  /** Human-readable name */
  name: string

  /** Provider-specific configuration */
  config?: Record<string, unknown>
}

// =============================================================================
// Conversation / Thread Types
// =============================================================================

/**
 * A conversation thread with an agent
 */
export interface AgentThread {
  /** Unique thread identifier */
  id: string

  /** Agent this thread belongs to */
  agentId: string

  /** Provider that manages this thread */
  provider: AgentProvider

  /** Provider-specific thread ID */
  externalId?: string

  /** Thread title/summary */
  title?: string

  /** Messages in this thread */
  messages: AgentMessage[]

  /** Thread metadata */
  metadata?: Record<string, unknown>

  /** Timestamps */
  createdAt: Date
  updatedAt: Date
}

export interface AgentMessage {
  /** Message identifier */
  id: string

  /** Message role */
  role: 'user' | 'assistant' | 'system' | 'tool'

  /** Message content */
  content: string | AgentMessageContent[]

  /** Tool calls made by assistant */
  toolCalls?: AgentToolCall[]

  /** Tool result (for tool role) */
  toolResult?: AgentToolResult

  /** Metadata */
  metadata?: Record<string, unknown>

  /** Timestamp */
  createdAt: Date
}

export type AgentMessageContent =
  | { type: 'text'; text: string }
  | { type: 'image'; url?: string; base64?: string; mimeType?: string }
  | { type: 'file'; fileId: string; fileName?: string }

export interface AgentToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
}

export interface AgentToolResult {
  toolCallId: string
  output: string
  error?: string
}

// =============================================================================
// Execution Types
// =============================================================================

/**
 * Request to run an agent
 */
export interface AgentRunRequest {
  /** Agent to run */
  agentId: string

  /** Thread to continue (or create new) */
  threadId?: string

  /** User message */
  message: string | AgentMessageContent[]

  /** Additional context */
  context?: {
    /** User information */
    user?: { id?: string; name?: string; email?: string }
    /** Timezone */
    timezone?: string
    /** Custom context */
    custom?: Record<string, unknown>
  }

  /** Override agent parameters for this run */
  parameterOverrides?: Partial<AgentParameters>

  /** Stream the response */
  stream?: boolean
}

/**
 * Result from running an agent
 */
export interface AgentRunResult {
  /** Run identifier */
  runId: string

  /** Thread ID (created or existing) */
  threadId: string

  /** Agent's response */
  message: AgentMessage

  /** Tool calls that were made */
  toolCalls?: AgentToolCall[]

  /** Citations/sources */
  citations?: AgentCitation[]

  /** Token usage */
  usage?: {
    inputTokens: number
    outputTokens: number
    totalTokens: number
  }

  /** Run status */
  status: 'completed' | 'failed' | 'cancelled' | 'requires_action'

  /** Error if failed */
  error?: string
}

export interface AgentCitation {
  id: string
  title: string
  url: string
  snippet: string
  source: string
}

// =============================================================================
// Streaming Types
// =============================================================================

export type AgentStreamEvent =
  | { type: 'start'; runId: string; threadId: string }
  | { type: 'delta'; content: string }
  | { type: 'tool_call_start'; toolCall: AgentToolCall }
  | { type: 'tool_call_delta'; toolCallId: string; delta: string }
  | { type: 'tool_call_end'; toolCallId: string; result: AgentToolResult }
  | { type: 'citation'; citations: AgentCitation[] }
  | { type: 'done'; message: AgentMessage; usage?: AgentRunResult['usage'] }
  | { type: 'error'; error: string }

// =============================================================================
// Agent Service Interface
// =============================================================================

/**
 * Unified interface for agent operations across all providers
 */
export interface IAgentService {
  /** Get provider capabilities */
  getCapabilities(): ProviderCapabilities

  // Agent CRUD (may throw if not supported)
  createAgent(config: Omit<AgentConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<AgentConfig>
  getAgent(agentId: string): Promise<AgentConfig>
  updateAgent(agentId: string, updates: Partial<AgentConfig>): Promise<AgentConfig>
  deleteAgent(agentId: string): Promise<void>
  listAgents(options?: { query?: string; limit?: number }): Promise<AgentConfig[]>

  // Thread management
  createThread(agentId: string): Promise<AgentThread>
  getThread(threadId: string): Promise<AgentThread>
  deleteThread(threadId: string): Promise<void>
  listThreads(agentId: string): Promise<AgentThread[]>

  // Execution
  run(request: AgentRunRequest): Promise<AgentRunResult>
  runStream(request: AgentRunRequest): AsyncGenerator<AgentStreamEvent>

  // Tool handling
  submitToolResults(
    runId: string,
    results: AgentToolResult[]
  ): Promise<AgentRunResult>
}

/**
 * Error thrown when an operation is not supported by the provider
 */
export class AgentOperationNotSupportedError extends Error {
  constructor(
    public operation: string,
    public provider: AgentProvider
  ) {
    super(
      `Operation "${operation}" is not supported by provider "${provider}". ` +
        `Check PROVIDER_CAPABILITIES for supported operations.`
    )
    this.name = 'AgentOperationNotSupportedError'
  }
}

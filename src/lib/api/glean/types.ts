/**
 * Glean API Types
 * Type definitions for Glean Search and Chat APIs
 */

// Search Request/Response Types
export interface GleanSearchRequest {
  query: string
  pageSize?: number
  cursor?: string
  requestOptions?: {
    facetFilters?: GleanFacetFilter[]
    timeRange?: {
      start: string
      end: string
    }
    datasourceFilter?: string
  }
}

export interface GleanFacetFilter {
  fieldName: string
  values: string[]
}

export interface GleanSearchResponse {
  results: GleanSearchResult[]
  facetResults?: GleanFacetResult[]
  cursor?: string
  hasMoreResults: boolean
  totalResultCount?: number
}

export interface GleanSearchResult {
  document: GleanDocument
  snippets: GleanSnippet[]
  score: number
}

export interface GleanDocument {
  id: string
  title: string
  url: string
  datasource: string
  docType?: string
  author?: GleanPerson
  updatedAt?: string
  createdAt?: string
  containerName?: string
}

export interface GleanSnippet {
  snippet: string
  mimeType: string
}

export interface GleanPerson {
  name: string
  email?: string
  avatarUrl?: string
}

export interface GleanFacetResult {
  sourceName: string
  buckets: Array<{
    value: string
    count: number
  }>
}

// Citation Types
export interface GleanCitation {
  id: string
  title: string
  url: string
  snippet: string
  sourceType: GleanSourceType
  author?: string
  updatedAt?: string
  datasource: string
}

export type GleanSourceType =
  | 'confluence'
  | 'gdrive'
  | 'slack'
  | 'github'
  | 'notion'
  | 'jira'
  | 'sharepoint'
  | 'custom'

// Chat Types (extends provider types)
export interface GleanChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface GleanChatRequest {
  messages: GleanChatMessage[]
  agentId?: string
  stream?: boolean
  retrievalConfig?: {
    dataSources?: string[]
  }
}

export interface GleanChatResponse {
  id: string
  message: {
    role: 'assistant'
    content: string
  }
  citations?: GleanCitation[]
}

// Search Tool Types
export interface GleanSearchToolInput {
  query: string
  datasource?: string
  maxResults?: number
}

export interface GleanSearchToolResult {
  results: Array<{
    title: string
    url: string
    snippet: string
    source: string
    author?: string
    updatedAt?: string
  }>
  totalCount: number
}

// Service Types
export interface GleanServiceConfig {
  apiKey?: string
  apiUrl?: string
}

// =============================================================================
// Glean Agents API Types (Real API)
// Reference: https://developers.glean.com/api/client-api/agents/overview
// =============================================================================

/**
 * Agent search request for POST /rest/api/v1/agents/search
 */
export interface GleanAgentSearchRequest {
  query?: string
  pageSize?: number
  cursor?: string
}

/**
 * Agent search response
 */
export interface GleanAgentSearchResponse {
  agents: GleanAgent[]
  cursor?: string
  hasMoreResults: boolean
}

/**
 * Glean Agent (read-only from API)
 * Note: Agents can only be created/updated via Glean's Agent Builder UI
 */
export interface GleanAgent {
  id: string
  name: string
  description?: string
  createdAt: string
  updatedAt: string
  createdBy?: GleanPerson
  permissions?: GleanAgentPermissions
}

export interface GleanAgentPermissions {
  canRun: boolean
  canEdit: boolean
}

/**
 * Agent run request for POST /rest/api/v1/agents/runs/stream or /runs/wait
 */
export interface GleanAgentRunRequest {
  agentId: string
  messages: GleanAgentMessage[]
  context?: {
    conversationId?: string
    sessionId?: string
  }
}

export interface GleanAgentMessage {
  role: 'user' | 'assistant'
  content: string
}

/**
 * Agent run response (blocking mode)
 */
export interface GleanAgentRunResponse {
  runId: string
  status: 'completed' | 'failed' | 'cancelled'
  message: {
    role: 'assistant'
    content: string
  }
  citations?: GleanCitation[]
  usage?: {
    inputTokens?: number
    outputTokens?: number
  }
  conversationId?: string
}

/**
 * Streaming event types from POST /rest/api/v1/agents/runs/stream
 */
export type GleanStreamEvent =
  | GleanStreamStartEvent
  | GleanStreamDeltaEvent
  | GleanStreamCitationEvent
  | GleanStreamDoneEvent
  | GleanStreamErrorEvent

export interface GleanStreamStartEvent {
  type: 'start'
  runId: string
  conversationId?: string
}

export interface GleanStreamDeltaEvent {
  type: 'delta'
  content: string
}

export interface GleanStreamCitationEvent {
  type: 'citation'
  citations: GleanCitation[]
}

export interface GleanStreamDoneEvent {
  type: 'done'
  message: {
    role: 'assistant'
    content: string
  }
  usage?: {
    inputTokens?: number
    outputTokens?: number
  }
}

export interface GleanStreamErrorEvent {
  type: 'error'
  error: {
    code: string
    message: string
  }
}

/**
 * Agent schema request for GET /rest/api/v1/agents/{agent_id}/schemas
 */
export interface GleanAgentSchema {
  agentId: string
  inputSchema?: {
    type: 'object'
    properties?: Record<string, GleanSchemaProperty>
    required?: string[]
  }
  outputSchema?: {
    type: 'object'
    properties?: Record<string, GleanSchemaProperty>
  }
}

export interface GleanSchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object'
  description?: string
  enum?: string[]
  items?: GleanSchemaProperty
}

// =============================================================================
// Dust Agents API Types (Real API)
// Reference: https://docs.dust.tt/reference/get_api-v1-w-wid-assistant-agent-configurations
// =============================================================================

/**
 * Dust Agent Configuration (read-only from API, except userFavorite)
 */
export interface DustAgentConfiguration {
  id: number
  sId: string
  version: number
  name: string
  description: string
  instructions: string | null
  pictureUrl: string
  status: 'active' | 'archived'
  scope: 'workspace' | 'published' | 'global'
  userFavorite: boolean
  model: DustAgentModel
  actions: DustAgentAction[]
  maxStepsPerRun: number
  templateId: string | null
}

export interface DustAgentModel {
  providerId: string
  modelId: string
  temperature: number
}

export interface DustAgentAction {
  id: number
  sId: string
  type: string
  name: string
  description?: string
}

/**
 * Dust conversation types
 */
export interface DustConversation {
  id: string
  sId: string
  created: number
  title?: string
  messages: DustMessage[]
}

export interface DustMessage {
  id: string
  sId: string
  type: 'user_message' | 'agent_message' | 'content_fragment'
  visibility: 'visible' | 'deleted'
  version: number
  created: number
  content?: string
  context?: DustMessageContext
  agentConfigurationId?: string
  status?: 'created' | 'succeeded' | 'failed' | 'cancelled'
  actions?: DustActionExecution[]
}

export interface DustMessageContext {
  username?: string
  timezone?: string
  fullName?: string
  email?: string
  profilePictureUrl?: string
}

export interface DustActionExecution {
  id: string
  type: string
  status: 'running' | 'succeeded' | 'failed'
  output?: unknown
}

/**
 * Dust conversation creation request
 */
export interface DustCreateConversationRequest {
  title?: string
  message: {
    content: string
    context?: DustMessageContext
    mentions?: DustMention[]
  }
  blocking?: boolean
}

export interface DustMention {
  configurationId: string
}

/**
 * Dust message creation request for continuing conversations
 */
export interface DustCreateMessageRequest {
  content: string
  context?: DustMessageContext
  mentions?: DustMention[]
}

/**
 * Dust content fragment for attaching files
 */
export interface DustContentFragment {
  title: string
  content: string
  url?: string
  contentType: 'file_attachment' | 'slack_thread_content'
}

/**
 * Dust streaming event types
 */
export type DustStreamEvent =
  | DustStreamUserMessageEvent
  | DustStreamAgentMessageEvent
  | DustStreamTokenEvent
  | DustStreamActionEvent
  | DustStreamDoneEvent
  | DustStreamErrorEvent

export interface DustStreamUserMessageEvent {
  type: 'user_message'
  message: DustMessage
}

export interface DustStreamAgentMessageEvent {
  type: 'agent_message'
  message: DustMessage
}

export interface DustStreamTokenEvent {
  type: 'generation_tokens'
  text: string
}

export interface DustStreamActionEvent {
  type: 'agent_action_success' | 'agent_action_started'
  action: DustActionExecution
}

export interface DustStreamDoneEvent {
  type: 'agent_message_success'
  message: DustMessage
}

export interface DustStreamErrorEvent {
  type: 'error'
  error: {
    code: string
    message: string
  }
}

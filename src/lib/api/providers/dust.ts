import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  StreamEvent,
  TokenUsage,
} from '@/types'
import type {
  DustAgentConfiguration,
  DustConversation,
  DustCreateConversationRequest,
  DustCreateMessageRequest,
  DustMessage,
  DustContentFragment,
  DustMessageContext,
} from '../glean/types'
import { BaseProvider } from './base'
import { getModelConfig } from '../config/providers'
import { handleProviderError, ModelNotFoundError, APIError } from '../errors/apiErrors'
import { createStartEvent, createDeltaEvent, createDoneEvent, createErrorEvent } from '../streaming/encoder'

interface DustConversationRequest {
  message: {
    content: string
    context?: {
      username?: string
      timezone?: string
    }
  }
  blocking?: boolean
}

interface DustConversationResponse {
  conversation: {
    id: string
    messages: Array<{
      id: string
      type: 'user' | 'assistant'
      content: string
    }>
  }
}

export class DustProvider extends BaseProvider {
  provider = 'dust' as const

  private getBaseUrl(): string {
    return this.getApiUrl() || 'https://dust.tt/api/v1'
  }

  protected async healthCheck(): Promise<void> {
    const response = await fetch(`${this.getBaseUrl()}/me`, {
      headers: this.getHeaders(),
    })

    if (!response.ok) {
      throw new Error(`Dust health check failed: ${response.status}`)
    }
  }

  private getHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.getApiKey()}`,
      'Content-Type': 'application/json',
    }
  }

  async complete(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const startTime = Date.now()
    const model = getModelConfig(request.model)

    if (!model || model.provider !== 'dust') {
      throw new ModelNotFoundError(request.model, 'dust')
    }

    try {
      // Get the last user message (filter out tool messages)
      const lastUserMessage = [...request.messages]
        .reverse()
        .find((m) => m.role === 'user' && m.content)

      if (!lastUserMessage) {
        throw new APIError('No user message provided')
      }

      // Extract text content (Dust doesn't support images)
      const textContent = typeof lastUserMessage.content === 'string'
        ? lastUserMessage.content
        : lastUserMessage.content?.find((p) => p.type === 'text')?.text || ''

      const dustRequest: DustConversationRequest = {
        message: {
          content: textContent,
        },
        blocking: true,
      }

      // Extract workspace ID and assistant ID from model ID if present
      // Format: dust-assistant or dust-{workspaceId}-{assistantId}
      let endpoint = `${this.getBaseUrl()}/conversations`

      if (request.model !== 'dust-assistant') {
        const parts = request.model.split('-')
        if (parts.length >= 3) {
          const workspaceId = parts[1]
          const assistantId = parts.slice(2).join('-')
          endpoint = `${this.getBaseUrl()}/w/${workspaceId}/assistant/conversations`
          dustRequest.message.context = {
            ...dustRequest.message.context,
          }
        }
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(dustRequest),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new APIError(`Dust API error: ${errorText}`, response.status)
      }

      const data: DustConversationResponse = await response.json()

      // Get the last assistant message
      const assistantMessage = [...data.conversation.messages]
        .reverse()
        .find((m) => m.type === 'assistant')

      const content = assistantMessage?.content ?? ''

      // Estimate tokens
      const inputTokens = await this.countTokens(request.messages)
      const outputTokens = Math.ceil(content.length / 4)

      const usage: TokenUsage = {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
      }

      return {
        id: data.conversation.id,
        message: {
          role: 'assistant',
          content,
        },
        metadata: {
          model: request.model,
          provider: 'dust',
          processingTimeMs: Date.now() - startTime,
          finishReason: 'stop',
        },
        usage,
      }
    } catch (error) {
      throw handleProviderError(error, 'dust')
    }
  }

  async *stream(request: ChatCompletionRequest): AsyncGenerator<StreamEvent> {
    const startTime = Date.now()
    const model = getModelConfig(request.model)

    if (!model || model.provider !== 'dust') {
      throw new ModelNotFoundError(request.model, 'dust')
    }

    const id = this.generateId()
    yield createStartEvent(id)

    try {
      // Get the last user message (filter out tool messages)
      const lastUserMessage = [...request.messages]
        .reverse()
        .find((m) => m.role === 'user' && m.content)

      if (!lastUserMessage) {
        throw new APIError('No user message provided')
      }

      // Extract text content (Dust doesn't support images)
      const textContent = typeof lastUserMessage.content === 'string'
        ? lastUserMessage.content
        : lastUserMessage.content?.find((p) => p.type === 'text')?.text || ''

      const dustRequest: DustConversationRequest = {
        message: {
          content: textContent,
        },
        blocking: false,
      }

      let endpoint = `${this.getBaseUrl()}/conversations`

      if (request.model !== 'dust-assistant') {
        const parts = request.model.split('-')
        if (parts.length >= 3) {
          const workspaceId = parts[1]
          endpoint = `${this.getBaseUrl()}/w/${workspaceId}/assistant/conversations`
        }
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          Accept: 'text/event-stream',
        },
        body: JSON.stringify(dustRequest),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new APIError(`Dust API error: ${errorText}`, response.status)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new APIError('No response body')
      }

      const decoder = new TextDecoder()
      let fullContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data)
              if (parsed.type === 'assistant_message' && parsed.content) {
                const delta = parsed.content
                fullContent += delta
                yield createDeltaEvent(delta)
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }

      const inputTokens = await this.countTokens(request.messages)
      const outputTokens = Math.ceil(fullContent.length / 4)

      const usage: TokenUsage = {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
      }

      yield createDoneEvent(fullContent, usage, {
        model: request.model,
        provider: 'dust',
        processingTimeMs: Date.now() - startTime,
        finishReason: 'stop',
      })
    } catch (error) {
      const apiError = handleProviderError(error, 'dust')
      yield createErrorEvent(apiError.message)
    }
  }

  // ==========================================================================
  // Dust Agents API (Real API)
  // Reference: https://docs.dust.tt/reference/get_api-v1-w-wid-assistant-agent-configurations
  //
  // NOTE: Agent creation, update, and deletion are NOT supported via API.
  // Agents must be created and configured via the Dust workspace UI.
  // The only writable field via API is userFavorite.
  // ==========================================================================

  /**
   * List agent configurations for a workspace
   * Uses GET /api/v1/w/{wId}/assistant/agent_configurations
   */
  async listAgents(
    workspaceId: string,
    options?: {
      view?: 'list' | 'all' | 'workspace' | 'published' | 'global' | 'favorites'
      limit?: number
    }
  ): Promise<DustAgentConfiguration[]> {
    try {
      const params = new URLSearchParams()
      if (options?.view) params.set('view', options.view)
      if (options?.limit) params.set('limit', options.limit.toString())

      const response = await fetch(
        `${this.getBaseUrl()}/w/${workspaceId}/assistant/agent_configurations?${params}`,
        {
          headers: this.getHeaders(),
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        throw new APIError(`Failed to list agents: ${errorText}`, response.status)
      }

      const data = await response.json()
      return data.agentConfigurations || []
    } catch (error) {
      throw handleProviderError(error, 'dust')
    }
  }

  /**
   * Get a specific agent configuration
   * Uses GET /api/v1/w/{wId}/assistant/agent_configurations/{sId}
   */
  async getAgent(
    workspaceId: string,
    agentId: string
  ): Promise<DustAgentConfiguration> {
    try {
      const response = await fetch(
        `${this.getBaseUrl()}/w/${workspaceId}/assistant/agent_configurations/${agentId}`,
        {
          headers: this.getHeaders(),
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        throw new APIError(`Failed to get agent: ${errorText}`, response.status)
      }

      const data = await response.json()
      return data.agentConfiguration
    } catch (error) {
      throw handleProviderError(error, 'dust')
    }
  }

  /**
   * Search for agents by query
   * Uses GET /api/v1/w/{wId}/assistant/agent_configurations/search
   */
  async searchAgents(
    workspaceId: string,
    query: string
  ): Promise<DustAgentConfiguration[]> {
    try {
      const response = await fetch(
        `${this.getBaseUrl()}/w/${workspaceId}/assistant/agent_configurations/search?q=${encodeURIComponent(query)}`,
        {
          headers: this.getHeaders(),
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        throw new APIError(`Failed to search agents: ${errorText}`, response.status)
      }

      const data = await response.json()
      return data.agentConfigurations || []
    } catch (error) {
      throw handleProviderError(error, 'dust')
    }
  }

  /**
   * Toggle agent favorite status (only writable field via API)
   * Uses PATCH /api/v1/w/{wId}/assistant/agent_configurations/{sId}
   */
  async toggleAgentFavorite(
    workspaceId: string,
    agentId: string,
    isFavorite: boolean
  ): Promise<DustAgentConfiguration> {
    try {
      const response = await fetch(
        `${this.getBaseUrl()}/w/${workspaceId}/assistant/agent_configurations/${agentId}`,
        {
          method: 'PATCH',
          headers: this.getHeaders(),
          body: JSON.stringify({ userFavorite: isFavorite }),
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        throw new APIError(`Failed to update agent favorite: ${errorText}`, response.status)
      }

      const data = await response.json()
      return data.agentConfiguration
    } catch (error) {
      throw handleProviderError(error, 'dust')
    }
  }

  // ==========================================================================
  // Dust Conversations API
  // ==========================================================================

  /**
   * Create a new conversation with an agent
   * Uses POST /api/v1/w/{wId}/assistant/conversations
   */
  async createConversation(
    workspaceId: string,
    request: DustCreateConversationRequest
  ): Promise<DustConversation> {
    try {
      const response = await fetch(
        `${this.getBaseUrl()}/w/${workspaceId}/assistant/conversations`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(request),
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        throw new APIError(`Failed to create conversation: ${errorText}`, response.status)
      }

      const data = await response.json()
      return data.conversation
    } catch (error) {
      throw handleProviderError(error, 'dust')
    }
  }

  /**
   * Get a conversation by ID
   * Uses GET /api/v1/w/{wId}/assistant/conversations/{cId}
   */
  async getConversation(
    workspaceId: string,
    conversationId: string
  ): Promise<DustConversation> {
    try {
      const response = await fetch(
        `${this.getBaseUrl()}/w/${workspaceId}/assistant/conversations/${conversationId}`,
        {
          headers: this.getHeaders(),
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        throw new APIError(`Failed to get conversation: ${errorText}`, response.status)
      }

      const data = await response.json()
      return data.conversation
    } catch (error) {
      throw handleProviderError(error, 'dust')
    }
  }

  /**
   * Add a message to a conversation
   * Uses POST /api/v1/w/{wId}/assistant/conversations/{cId}/messages
   */
  async addMessage(
    workspaceId: string,
    conversationId: string,
    request: DustCreateMessageRequest
  ): Promise<DustMessage> {
    try {
      const response = await fetch(
        `${this.getBaseUrl()}/w/${workspaceId}/assistant/conversations/${conversationId}/messages`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(request),
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        throw new APIError(`Failed to add message: ${errorText}`, response.status)
      }

      const data = await response.json()
      return data.message
    } catch (error) {
      throw handleProviderError(error, 'dust')
    }
  }

  /**
   * Cancel a running generation
   * Uses POST /api/v1/w/{wId}/assistant/conversations/{cId}/cancel
   */
  async cancelGeneration(
    workspaceId: string,
    conversationId: string
  ): Promise<void> {
    try {
      const response = await fetch(
        `${this.getBaseUrl()}/w/${workspaceId}/assistant/conversations/${conversationId}/cancel`,
        {
          method: 'POST',
          headers: this.getHeaders(),
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        throw new APIError(`Failed to cancel generation: ${errorText}`, response.status)
      }
    } catch (error) {
      throw handleProviderError(error, 'dust')
    }
  }

  /**
   * Submit feedback on a message
   * Uses POST /api/v1/w/{wId}/assistant/conversations/{cId}/messages/{mId}/feedbacks
   */
  async submitFeedback(
    workspaceId: string,
    conversationId: string,
    messageId: string,
    feedback: { thumbDirection: 'up' | 'down'; content?: string }
  ): Promise<void> {
    try {
      const response = await fetch(
        `${this.getBaseUrl()}/w/${workspaceId}/assistant/conversations/${conversationId}/messages/${messageId}/feedbacks`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(feedback),
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        throw new APIError(`Failed to submit feedback: ${errorText}`, response.status)
      }
    } catch (error) {
      throw handleProviderError(error, 'dust')
    }
  }

  /**
   * Create a content fragment (attach file/content to conversation)
   * Uses POST /api/v1/w/{wId}/assistant/conversations/{cId}/content_fragments
   */
  async createContentFragment(
    workspaceId: string,
    conversationId: string,
    fragment: DustContentFragment
  ): Promise<void> {
    try {
      const response = await fetch(
        `${this.getBaseUrl()}/w/${workspaceId}/assistant/conversations/${conversationId}/content_fragments`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(fragment),
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        throw new APIError(`Failed to create content fragment: ${errorText}`, response.status)
      }
    } catch (error) {
      throw handleProviderError(error, 'dust')
    }
  }

  /**
   * Validate an action execution
   * Uses POST /api/v1/w/{wId}/assistant/conversations/{cId}/messages/{mId}/validate-action
   */
  async validateAction(
    workspaceId: string,
    conversationId: string,
    messageId: string,
    actionId: string,
    approved: boolean
  ): Promise<void> {
    try {
      const response = await fetch(
        `${this.getBaseUrl()}/w/${workspaceId}/assistant/conversations/${conversationId}/messages/${messageId}/validate-action`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({ actionId, approved }),
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        throw new APIError(`Failed to validate action: ${errorText}`, response.status)
      }
    } catch (error) {
      throw handleProviderError(error, 'dust')
    }
  }

  /**
   * Stream conversation events
   * Uses GET /api/v1/w/{wId}/assistant/conversations/{cId}/events
   */
  async *streamConversationEvents(
    workspaceId: string,
    conversationId: string
  ): AsyncGenerator<{ type: string; data?: unknown }> {
    try {
      const response = await fetch(
        `${this.getBaseUrl()}/w/${workspaceId}/assistant/conversations/${conversationId}/events`,
        {
          headers: {
            ...this.getHeaders(),
            Accept: 'text/event-stream',
          },
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        throw new APIError(`Failed to stream events: ${errorText}`, response.status)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new APIError('No response body')
      }

      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') {
              yield { type: 'done' }
              continue
            }

            try {
              const parsed = JSON.parse(data)
              yield parsed
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (error) {
      const apiError = handleProviderError(error, 'dust')
      yield { type: 'error', data: { message: apiError.message } }
    }
  }
}

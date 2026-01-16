import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  StreamEvent,
  TokenUsage,
  GleanAgentConfig,
  GleanDataSource,
  CreateGleanAgentInput,
  UpdateGleanAgentInput,
} from '@/types'
import { BaseProvider } from './base'
import { getModelConfig } from '../config/providers'
import { handleProviderError, ModelNotFoundError, APIError } from '../errors/apiErrors'
import { createStartEvent, createDeltaEvent, createDoneEvent, createErrorEvent } from '../streaming/encoder'

interface GleanChatRequest {
  messages: Array<{
    role: 'user' | 'assistant'
    content: string
  }>
  agentId?: string
  stream?: boolean
}

interface GleanChatResponse {
  id: string
  message: {
    role: 'assistant'
    content: string
  }
  citations?: GleanCitation[]
}

interface GleanCitation {
  title: string
  url: string
  snippet: string
  source: string
}

interface GleanAgentAPIResponse {
  id: string
  name: string
  description?: string
  systemPrompt: string
  dataSources: string[]
  temperature: number
  createdAt: string
  updatedAt: string
}

export class GleanProvider extends BaseProvider {
  provider = 'glean' as const

  private getBaseUrl(): string {
    return this.getApiUrl() || 'https://api.glean.com/v1'
  }

  protected async healthCheck(): Promise<void> {
    const response = await fetch(`${this.getBaseUrl()}/health`, {
      headers: this.getHeaders(),
    })

    if (!response.ok) {
      throw new Error(`Glean health check failed: ${response.status}`)
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

    if (!model || model.provider !== 'glean') {
      throw new ModelNotFoundError(request.model, 'glean')
    }

    try {
      const gleanRequest: GleanChatRequest = {
        // Filter out tool messages (not supported by Glean)
        messages: request.messages
          .filter((msg) => msg.role !== 'tool')
          .map((msg) => {
            // Extract text content (Glean doesn't support images)
            const textContent = typeof msg.content === 'string'
              ? msg.content
              : msg.content?.find((p) => p.type === 'text')?.text || ''
            return {
              role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
              content: textContent,
            }
          }),
        stream: false,
      }

      // If the model ID contains an agent ID, extract it
      if (request.model.startsWith('glean-agent-')) {
        gleanRequest.agentId = request.model.replace('glean-agent-', '')
      }

      const response = await fetch(`${this.getBaseUrl()}/chat`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(gleanRequest),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new APIError(`Glean API error: ${errorText}`, response.status)
      }

      const data: GleanChatResponse = await response.json()

      // Append citations if available
      let content = data.message.content
      if (data.citations && data.citations.length > 0) {
        content += '\n\n---\n**Sources:**\n'
        data.citations.forEach((citation, index) => {
          content += `${index + 1}. [${citation.title}](${citation.url})\n`
        })
      }

      // Estimate tokens (Glean doesn't provide token counts)
      const inputTokens = await this.countTokens(request.messages)
      const outputTokens = Math.ceil(content.length / 4)

      const usage: TokenUsage = {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
      }

      return {
        id: data.id,
        message: {
          role: 'assistant',
          content,
        },
        metadata: {
          model: request.model,
          provider: 'glean',
          processingTimeMs: Date.now() - startTime,
          finishReason: 'stop',
        },
        usage,
      }
    } catch (error) {
      throw handleProviderError(error, 'glean')
    }
  }

  async *stream(request: ChatCompletionRequest): AsyncGenerator<StreamEvent> {
    const startTime = Date.now()
    const model = getModelConfig(request.model)

    if (!model || model.provider !== 'glean') {
      throw new ModelNotFoundError(request.model, 'glean')
    }

    const id = this.generateId()
    yield createStartEvent(id)

    try {
      const gleanRequest: GleanChatRequest = {
        // Filter out tool messages (not supported by Glean)
        messages: request.messages
          .filter((msg) => msg.role !== 'tool')
          .map((msg) => {
            // Extract text content (Glean doesn't support images)
            const textContent = typeof msg.content === 'string'
              ? msg.content
              : msg.content?.find((p) => p.type === 'text')?.text || ''
            return {
              role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
              content: textContent,
            }
          }),
        stream: true,
      }

      if (request.model.startsWith('glean-agent-')) {
        gleanRequest.agentId = request.model.replace('glean-agent-', '')
      }

      const response = await fetch(`${this.getBaseUrl()}/chat`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(gleanRequest),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new APIError(`Glean API error: ${errorText}`, response.status)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new APIError('No response body')
      }

      const decoder = new TextDecoder()
      let fullContent = ''
      let citations: GleanCitation[] = []

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
              if (parsed.delta) {
                fullContent += parsed.delta
                yield createDeltaEvent(parsed.delta)
              }
              if (parsed.citations) {
                citations = parsed.citations
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }

      // Append citations
      if (citations.length > 0) {
        const citationText = '\n\n---\n**Sources:**\n' +
          citations.map((c, i) => `${i + 1}. [${c.title}](${c.url})`).join('\n')
        fullContent += citationText
        yield createDeltaEvent(citationText)
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
        provider: 'glean',
        processingTimeMs: Date.now() - startTime,
        finishReason: 'stop',
      })
    } catch (error) {
      const apiError = handleProviderError(error, 'glean')
      yield createErrorEvent(apiError.message)
    }
  }

  // Glean Agent Management
  async listAgents(workspaceId: string): Promise<GleanAgentConfig[]> {
    try {
      const response = await fetch(
        `${this.getBaseUrl()}/agents?workspaceId=${workspaceId}`,
        {
          headers: this.getHeaders(),
        }
      )

      if (!response.ok) {
        throw new APIError(`Failed to list agents: ${response.status}`)
      }

      const data: GleanAgentAPIResponse[] = await response.json()

      return data.map((agent) => this.mapAgentResponse(agent, workspaceId))
    } catch (error) {
      throw handleProviderError(error, 'glean')
    }
  }

  async getAgent(agentId: string): Promise<GleanAgentConfig> {
    try {
      const response = await fetch(`${this.getBaseUrl()}/agents/${agentId}`, {
        headers: this.getHeaders(),
      })

      if (!response.ok) {
        throw new APIError(`Failed to get agent: ${response.status}`)
      }

      const data: GleanAgentAPIResponse = await response.json()
      return this.mapAgentResponse(data, '')
    } catch (error) {
      throw handleProviderError(error, 'glean')
    }
  }

  async createAgent(
    workspaceId: string,
    input: CreateGleanAgentInput
  ): Promise<GleanAgentConfig> {
    try {
      const response = await fetch(`${this.getBaseUrl()}/agents`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          workspaceId,
          name: input.name,
          description: input.description,
          systemPrompt: input.systemPrompt,
          dataSources: input.dataSourceIds,
          temperature: input.temperature ?? 0.7,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new APIError(`Failed to create agent: ${errorText}`, response.status)
      }

      const data: GleanAgentAPIResponse = await response.json()
      return this.mapAgentResponse(data, workspaceId)
    } catch (error) {
      throw handleProviderError(error, 'glean')
    }
  }

  async updateAgent(
    agentId: string,
    input: UpdateGleanAgentInput
  ): Promise<GleanAgentConfig> {
    try {
      const response = await fetch(`${this.getBaseUrl()}/agents/${agentId}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({
          name: input.name,
          description: input.description,
          systemPrompt: input.systemPrompt,
          dataSources: input.dataSourceIds,
          temperature: input.temperature,
        }),
      })

      if (!response.ok) {
        throw new APIError(`Failed to update agent: ${response.status}`)
      }

      const data: GleanAgentAPIResponse = await response.json()
      return this.mapAgentResponse(data, '')
    } catch (error) {
      throw handleProviderError(error, 'glean')
    }
  }

  async deleteAgent(agentId: string): Promise<void> {
    try {
      const response = await fetch(`${this.getBaseUrl()}/agents/${agentId}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      })

      if (!response.ok) {
        throw new APIError(`Failed to delete agent: ${response.status}`)
      }
    } catch (error) {
      throw handleProviderError(error, 'glean')
    }
  }

  async listDataSources(): Promise<GleanDataSource[]> {
    try {
      const response = await fetch(`${this.getBaseUrl()}/datasources`, {
        headers: this.getHeaders(),
      })

      if (!response.ok) {
        throw new APIError(`Failed to list data sources: ${response.status}`)
      }

      interface GleanDataSourceResponse {
        id: string
        type: string
        name: string
        description?: string
        isEnabled: boolean
      }

      const data: GleanDataSourceResponse[] = await response.json()

      return data.map((ds) => ({
        id: ds.id,
        type: ds.type as GleanDataSource['type'],
        name: ds.name,
        description: ds.description,
        isEnabled: ds.isEnabled,
      }))
    } catch (error) {
      throw handleProviderError(error, 'glean')
    }
  }

  private mapAgentResponse(
    agent: GleanAgentAPIResponse,
    workspaceId: string
  ): GleanAgentConfig {
    return {
      id: agent.id,
      name: agent.name,
      description: agent.description,
      systemPrompt: agent.systemPrompt,
      dataSources: agent.dataSources.map((dsId) => ({
        id: dsId,
        type: 'custom' as const,
        name: dsId,
        isEnabled: true,
      })),
      temperature: agent.temperature,
      workspaceId,
      createdAt: new Date(agent.createdAt),
      updatedAt: new Date(agent.updatedAt),
    }
  }
}

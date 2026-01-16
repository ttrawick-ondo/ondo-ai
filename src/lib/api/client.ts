import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  StreamCallbacks,
  StreamEvent,
  ProvidersResponse,
  GleanAgentConfig,
  CreateGleanAgentInput,
  UpdateGleanAgentInput,
  GleanDataSource,
} from '@/types'
import { parseSSEResponse } from './streaming/encoder'

class APIClient {
  private baseUrl: string

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl
  }

  private async fetch<T>(
    path: string,
    options?: RequestInit
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: response.statusText,
      }))
      throw new Error(error.message || 'API request failed')
    }

    return response.json()
  }
}

export class ChatClient {
  private baseUrl: string

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl
  }

  async complete(
    request: Omit<ChatCompletionRequest, 'options'> & {
      options?: ChatCompletionRequest['options'] & { stream?: false }
    }
  ): Promise<ChatCompletionResponse> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...request,
        options: {
          ...request.options,
          stream: false,
        },
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: response.statusText,
      }))
      throw new Error(error.message || 'Chat request failed')
    }

    return response.json()
  }

  async stream(
    request: Omit<ChatCompletionRequest, 'options'> & {
      options?: Omit<ChatCompletionRequest['options'], 'stream'>
    },
    callbacks: StreamCallbacks
  ): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...request,
        options: {
          ...request.options,
          stream: true,
        },
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: response.statusText,
      }))
      callbacks.onError?.(error.message || 'Stream request failed')
      return
    }

    const reader = response.body?.getReader()
    if (!reader) {
      callbacks.onError?.('No response body')
      return
    }

    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')

        // Keep the last potentially incomplete line in the buffer
        buffer = lines.pop() || ''

        for (const line of lines) {
          const event = parseSSEResponse(line)
          if (!event) continue

          switch (event.type) {
            case 'start':
              callbacks.onStart?.()
              break
            case 'delta':
              if (event.data.delta) {
                callbacks.onDelta?.(event.data.delta)
              }
              break
            case 'done':
              if (event.data.content && event.data.usage && event.data.metadata) {
                callbacks.onDone?.({
                  id: event.data.id || '',
                  message: {
                    role: 'assistant',
                    content: event.data.content,
                  },
                  metadata: event.data.metadata,
                  usage: event.data.usage,
                })
              }
              break
            case 'error':
              callbacks.onError?.(event.data.error || 'Unknown error')
              break
          }
        }
      }
    } catch (error) {
      callbacks.onError?.(error instanceof Error ? error.message : 'Stream error')
    }
  }
}

export class ProvidersClient {
  private baseUrl: string

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl
  }

  async getProviders(): Promise<ProvidersResponse> {
    const response = await fetch(`${this.baseUrl}/api/providers`)

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: response.statusText,
      }))
      throw new Error(error.message || 'Failed to fetch providers')
    }

    return response.json()
  }
}

export class GleanClient {
  private baseUrl: string

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl
  }

  async listAgents(workspaceId: string): Promise<GleanAgentConfig[]> {
    const response = await fetch(
      `${this.baseUrl}/api/glean/agents?workspaceId=${encodeURIComponent(workspaceId)}`
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: response.statusText,
      }))
      throw new Error(error.message || 'Failed to list agents')
    }

    const data = await response.json()
    return data.agents
  }

  async getAgent(agentId: string): Promise<GleanAgentConfig> {
    const response = await fetch(`${this.baseUrl}/api/glean/agents/${agentId}`)

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: response.statusText,
      }))
      throw new Error(error.message || 'Failed to get agent')
    }

    const data = await response.json()
    return data.agent
  }

  async createAgent(
    workspaceId: string,
    input: CreateGleanAgentInput
  ): Promise<GleanAgentConfig> {
    const response = await fetch(
      `${this.baseUrl}/api/glean/agents?workspaceId=${encodeURIComponent(workspaceId)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      }
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: response.statusText,
      }))
      throw new Error(error.message || 'Failed to create agent')
    }

    const data = await response.json()
    return data.agent
  }

  async updateAgent(
    agentId: string,
    input: UpdateGleanAgentInput
  ): Promise<GleanAgentConfig> {
    const response = await fetch(`${this.baseUrl}/api/glean/agents/${agentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: response.statusText,
      }))
      throw new Error(error.message || 'Failed to update agent')
    }

    const data = await response.json()
    return data.agent
  }

  async deleteAgent(agentId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/glean/agents/${agentId}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: response.statusText,
      }))
      throw new Error(error.message || 'Failed to delete agent')
    }
  }

  async listDataSources(): Promise<GleanDataSource[]> {
    const response = await fetch(`${this.baseUrl}/api/glean/datasources`)

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: response.statusText,
      }))
      throw new Error(error.message || 'Failed to list data sources')
    }

    const data = await response.json()
    return data.dataSources
  }
}

// Export singleton instances
export const chatClient = new ChatClient()
export const providersClient = new ProvidersClient()
export const gleanClient = new GleanClient()

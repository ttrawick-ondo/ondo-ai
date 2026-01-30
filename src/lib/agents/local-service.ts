/**
 * Local Agent Service
 *
 * Stores agent configurations locally (in-memory or database) and
 * executes them using any configured LLM provider.
 *
 * This is the "agnostic" approach - we own the agent definitions
 * and can route execution to any provider.
 */

import { BaseAgentService } from './base-service'
import type {
  AgentConfig,
  AgentThread,
  AgentMessage,
  AgentRunRequest,
  AgentRunResult,
  AgentStreamEvent,
  AgentToolResult,
  AgentMessageContent,
} from './types'

// =============================================================================
// Storage Interface - Can be swapped for database, Redis, etc.
// =============================================================================

interface AgentStorage {
  // Agents
  getAgent(id: string): Promise<AgentConfig | null>
  setAgent(agent: AgentConfig): Promise<void>
  deleteAgent(id: string): Promise<void>
  listAgents(options?: { query?: string; limit?: number }): Promise<AgentConfig[]>

  // Threads
  getThread(id: string): Promise<AgentThread | null>
  setThread(thread: AgentThread): Promise<void>
  deleteThread(id: string): Promise<void>
  listThreads(agentId: string): Promise<AgentThread[]>
}

// =============================================================================
// In-Memory Storage Implementation
// =============================================================================

class InMemoryStorage implements AgentStorage {
  private agents = new Map<string, AgentConfig>()
  private threads = new Map<string, AgentThread>()

  async getAgent(id: string): Promise<AgentConfig | null> {
    return this.agents.get(id) || null
  }

  async setAgent(agent: AgentConfig): Promise<void> {
    this.agents.set(agent.id, agent)
  }

  async deleteAgent(id: string): Promise<void> {
    this.agents.delete(id)
  }

  async listAgents(options?: {
    query?: string
    limit?: number
  }): Promise<AgentConfig[]> {
    let agents = Array.from(this.agents.values())

    if (options?.query) {
      const query = options.query.toLowerCase()
      agents = agents.filter(
        (a) =>
          a.name.toLowerCase().includes(query) ||
          a.description?.toLowerCase().includes(query)
      )
    }

    if (options?.limit) {
      agents = agents.slice(0, options.limit)
    }

    return agents
  }

  async getThread(id: string): Promise<AgentThread | null> {
    return this.threads.get(id) || null
  }

  async setThread(thread: AgentThread): Promise<void> {
    this.threads.set(thread.id, thread)
  }

  async deleteThread(id: string): Promise<void> {
    this.threads.delete(id)
  }

  async listThreads(agentId: string): Promise<AgentThread[]> {
    return Array.from(this.threads.values()).filter(
      (t) => t.agentId === agentId
    )
  }
}

// =============================================================================
// LLM Executor Interface - Handles actual model calls
// =============================================================================

interface LLMExecutor {
  execute(
    model: string,
    messages: AgentMessage[],
    tools?: AgentConfig['tools'],
    parameters?: AgentConfig['parameters']
  ): Promise<{
    content: string
    toolCalls?: AgentRunResult['toolCalls']
    usage?: AgentRunResult['usage']
  }>

  executeStream(
    model: string,
    messages: AgentMessage[],
    tools?: AgentConfig['tools'],
    parameters?: AgentConfig['parameters']
  ): AsyncGenerator<AgentStreamEvent>
}

// =============================================================================
// Local Agent Service Implementation
// =============================================================================

export class LocalAgentService extends BaseAgentService {
  private storage: AgentStorage
  private executor: LLMExecutor
  private pendingRuns = new Map<
    string,
    { agentId: string; threadId: string; messages: AgentMessage[] }
  >()

  constructor(options?: { storage?: AgentStorage; executor?: LLMExecutor }) {
    super('local')
    this.storage = options?.storage || new InMemoryStorage()
    this.executor = options?.executor || this.createDefaultExecutor()
  }

  private createDefaultExecutor(): LLMExecutor {
    // Default executor that calls our chat API
    return {
      execute: async (model, messages, tools, parameters) => {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            messages: messages.map((m) => ({
              role: m.role,
              content:
                typeof m.content === 'string'
                  ? m.content
                  : m.content
                      ?.filter(
                        (c): c is { type: 'text'; text: string } =>
                          c.type === 'text'
                      )
                      .map((c) => c.text)
                      .join('\n'),
            })),
            tools: tools?.map((t) => ({
              type: 'function',
              function: {
                name: t.name,
                description: t.description,
                parameters: t.parameters,
              },
            })),
            temperature: parameters?.temperature,
            max_tokens: parameters?.maxTokens,
          }),
        })

        if (!response.ok) {
          throw new Error(`Chat API error: ${response.statusText}`)
        }

        const data = await response.json()
        return {
          content: data.message?.content || '',
          toolCalls: data.toolCalls,
          usage: data.usage,
        }
      },

      executeStream: async function* (model, messages, tools, parameters) {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'text/event-stream',
          },
          body: JSON.stringify({
            model,
            messages: messages.map((m) => ({
              role: m.role,
              content:
                typeof m.content === 'string'
                  ? m.content
                  : m.content
                      ?.filter(
                        (c): c is { type: 'text'; text: string } =>
                          c.type === 'text'
                      )
                      .map((c) => c.text)
                      .join('\n'),
            })),
            tools: tools?.map((t) => ({
              type: 'function',
              function: {
                name: t.name,
                description: t.description,
                parameters: t.parameters,
              },
            })),
            temperature: parameters?.temperature,
            max_tokens: parameters?.maxTokens,
            stream: true,
          }),
        })

        if (!response.ok) {
          throw new Error(`Chat API error: ${response.statusText}`)
        }

        const reader = response.body?.getReader()
        if (!reader) throw new Error('No response body')

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
                if (parsed.type === 'delta' && parsed.content) {
                  fullContent += parsed.content
                  yield { type: 'delta', content: parsed.content }
                }
              } catch {
                // Ignore parse errors
              }
            }
          }
        }

        yield {
          type: 'done',
          message: {
            id: `msg_${Date.now()}`,
            role: 'assistant',
            content: fullContent,
            createdAt: new Date(),
          },
        }
      },
    }
  }

  // ==========================================================================
  // Agent CRUD
  // ==========================================================================

  async createAgent(
    config: Omit<AgentConfig, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<AgentConfig> {
    const now = new Date()
    const agent: AgentConfig = {
      ...config,
      id: this.generateId(),
      provider: 'local',
      createdAt: now,
      updatedAt: now,
    }

    await this.storage.setAgent(agent)
    return agent
  }

  async getAgent(agentId: string): Promise<AgentConfig> {
    const agent = await this.storage.getAgent(agentId)
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`)
    }
    return agent
  }

  async updateAgent(
    agentId: string,
    updates: Partial<AgentConfig>
  ): Promise<AgentConfig> {
    const existing = await this.getAgent(agentId)
    const updated: AgentConfig = {
      ...existing,
      ...updates,
      id: agentId, // Can't change ID
      provider: 'local', // Can't change provider
      createdAt: existing.createdAt, // Can't change created
      updatedAt: new Date(),
    }

    await this.storage.setAgent(updated)
    return updated
  }

  async deleteAgent(agentId: string): Promise<void> {
    await this.storage.deleteAgent(agentId)
  }

  async listAgents(options?: {
    query?: string
    limit?: number
  }): Promise<AgentConfig[]> {
    return this.storage.listAgents(options)
  }

  // ==========================================================================
  // Thread Management
  // ==========================================================================

  async createThread(agentId: string): Promise<AgentThread> {
    const now = new Date()
    const thread: AgentThread = {
      id: this.generateThreadId(),
      agentId,
      provider: 'local',
      messages: [],
      createdAt: now,
      updatedAt: now,
    }

    await this.storage.setThread(thread)
    return thread
  }

  async getThread(threadId: string): Promise<AgentThread> {
    const thread = await this.storage.getThread(threadId)
    if (!thread) {
      throw new Error(`Thread not found: ${threadId}`)
    }
    return thread
  }

  async deleteThread(threadId: string): Promise<void> {
    await this.storage.deleteThread(threadId)
  }

  async listThreads(agentId: string): Promise<AgentThread[]> {
    return this.storage.listThreads(agentId)
  }

  // ==========================================================================
  // Execution
  // ==========================================================================

  async run(request: AgentRunRequest): Promise<AgentRunResult> {
    const agent = await this.getAgent(request.agentId)
    const runId = this.generateRunId()

    // Get or create thread
    let thread: AgentThread
    if (request.threadId) {
      thread = await this.getThread(request.threadId)
    } else {
      thread = await this.createThread(request.agentId)
    }

    // Add user message
    const userMessage: AgentMessage = {
      id: this.generateMessageId(),
      role: 'user',
      content: request.message,
      createdAt: new Date(),
    }
    thread.messages.push(userMessage)

    // Build messages array with system prompt
    const messages: AgentMessage[] = [
      {
        id: 'system',
        role: 'system',
        content: agent.instructions,
        createdAt: new Date(),
      },
      ...thread.messages,
    ]

    // Merge parameters
    const parameters = {
      ...agent.parameters,
      ...request.parameterOverrides,
    }

    try {
      // Execute via LLM
      const result = await this.executor.execute(
        agent.model,
        messages,
        agent.tools,
        parameters
      )

      // Create assistant message
      const assistantMessage: AgentMessage = {
        id: this.generateMessageId(),
        role: 'assistant',
        content: result.content,
        toolCalls: result.toolCalls,
        createdAt: new Date(),
      }

      thread.messages.push(assistantMessage)
      thread.updatedAt = new Date()
      await this.storage.setThread(thread)

      // If there are tool calls, save state for submitToolResults
      if (result.toolCalls && result.toolCalls.length > 0) {
        this.pendingRuns.set(runId, {
          agentId: agent.id,
          threadId: thread.id,
          messages: [...messages, assistantMessage],
        })

        return {
          runId,
          threadId: thread.id,
          message: assistantMessage,
          toolCalls: result.toolCalls,
          usage: result.usage,
          status: 'requires_action',
        }
      }

      return {
        runId,
        threadId: thread.id,
        message: assistantMessage,
        usage: result.usage,
        status: 'completed',
      }
    } catch (error) {
      return {
        runId,
        threadId: thread.id,
        message: {
          id: this.generateMessageId(),
          role: 'assistant',
          content: '',
          createdAt: new Date(),
        },
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  async *runStream(request: AgentRunRequest): AsyncGenerator<AgentStreamEvent> {
    const agent = await this.getAgent(request.agentId)
    const runId = this.generateRunId()

    // Get or create thread
    let thread: AgentThread
    if (request.threadId) {
      thread = await this.getThread(request.threadId)
    } else {
      thread = await this.createThread(request.agentId)
    }

    yield { type: 'start', runId, threadId: thread.id }

    // Add user message
    const userMessage: AgentMessage = {
      id: this.generateMessageId(),
      role: 'user',
      content: request.message,
      createdAt: new Date(),
    }
    thread.messages.push(userMessage)

    // Build messages array with system prompt
    const messages: AgentMessage[] = [
      {
        id: 'system',
        role: 'system',
        content: agent.instructions,
        createdAt: new Date(),
      },
      ...thread.messages,
    ]

    const parameters = {
      ...agent.parameters,
      ...request.parameterOverrides,
    }

    try {
      // Stream from executor
      const stream = this.executor.executeStream(
        agent.model,
        messages,
        agent.tools,
        parameters
      )

      for await (const event of stream) {
        yield event
      }
    } catch (error) {
      yield {
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  async submitToolResults(
    runId: string,
    results: AgentToolResult[]
  ): Promise<AgentRunResult> {
    const pending = this.pendingRuns.get(runId)
    if (!pending) {
      throw new Error(`No pending run found: ${runId}`)
    }

    const agent = await this.getAgent(pending.agentId)
    const thread = await this.getThread(pending.threadId)

    // Add tool result messages
    const toolMessages: AgentMessage[] = results.map((r) => ({
      id: this.generateMessageId(),
      role: 'tool' as const,
      content: r.output,
      toolResult: r,
      createdAt: new Date(),
    }))

    thread.messages.push(...toolMessages)

    // Continue execution with tool results
    const messages: AgentMessage[] = [
      ...pending.messages,
      ...toolMessages,
    ]

    const result = await this.executor.execute(
      agent.model,
      messages,
      agent.tools,
      agent.parameters
    )

    const assistantMessage: AgentMessage = {
      id: this.generateMessageId(),
      role: 'assistant',
      content: result.content,
      toolCalls: result.toolCalls,
      createdAt: new Date(),
    }

    thread.messages.push(assistantMessage)
    thread.updatedAt = new Date()
    await this.storage.setThread(thread)

    // Clean up pending run
    this.pendingRuns.delete(runId)

    // Check if more tool calls
    if (result.toolCalls && result.toolCalls.length > 0) {
      this.pendingRuns.set(runId, {
        agentId: agent.id,
        threadId: thread.id,
        messages: [...messages, assistantMessage],
      })

      return {
        runId,
        threadId: thread.id,
        message: assistantMessage,
        toolCalls: result.toolCalls,
        usage: result.usage,
        status: 'requires_action',
      }
    }

    return {
      runId,
      threadId: thread.id,
      message: assistantMessage,
      usage: result.usage,
      status: 'completed',
    }
  }
}

// =============================================================================
// Singleton
// =============================================================================

let localAgentService: LocalAgentService | null = null

export function getLocalAgentService(): LocalAgentService {
  if (!localAgentService) {
    localAgentService = new LocalAgentService()
  }
  return localAgentService
}

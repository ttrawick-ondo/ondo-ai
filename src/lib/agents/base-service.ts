/**
 * Base Agent Service
 *
 * Abstract base class for implementing agent services across providers.
 * Provides common functionality and enforces the IAgentService interface.
 */

import type {
  AgentProvider,
  ProviderCapabilities,
  AgentConfig,
  AgentThread,
  AgentRunRequest,
  AgentRunResult,
  AgentStreamEvent,
  AgentToolResult,
  IAgentService,
} from './types'
import { PROVIDER_CAPABILITIES, AgentOperationNotSupportedError } from './types'

export abstract class BaseAgentService implements IAgentService {
  protected provider: AgentProvider

  constructor(provider: AgentProvider) {
    this.provider = provider
  }

  getCapabilities(): ProviderCapabilities {
    return PROVIDER_CAPABILITIES[this.provider]
  }

  /**
   * Check if an operation is supported, throw if not
   */
  protected requireCapability(
    capability: keyof ProviderCapabilities,
    operation: string
  ): void {
    const caps = this.getCapabilities()
    if (!caps[capability]) {
      throw new AgentOperationNotSupportedError(operation, this.provider)
    }
  }

  // ==========================================================================
  // Agent CRUD - Abstract methods to be implemented by providers
  // ==========================================================================

  abstract createAgent(
    config: Omit<AgentConfig, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<AgentConfig>

  abstract getAgent(agentId: string): Promise<AgentConfig>

  abstract updateAgent(
    agentId: string,
    updates: Partial<AgentConfig>
  ): Promise<AgentConfig>

  abstract deleteAgent(agentId: string): Promise<void>

  abstract listAgents(options?: {
    query?: string
    limit?: number
  }): Promise<AgentConfig[]>

  // ==========================================================================
  // Thread Management - Abstract methods
  // ==========================================================================

  abstract createThread(agentId: string): Promise<AgentThread>

  abstract getThread(threadId: string): Promise<AgentThread>

  abstract deleteThread(threadId: string): Promise<void>

  abstract listThreads(agentId: string): Promise<AgentThread[]>

  // ==========================================================================
  // Execution - Abstract methods
  // ==========================================================================

  abstract run(request: AgentRunRequest): Promise<AgentRunResult>

  abstract runStream(
    request: AgentRunRequest
  ): AsyncGenerator<AgentStreamEvent>

  abstract submitToolResults(
    runId: string,
    results: AgentToolResult[]
  ): Promise<AgentRunResult>

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  protected generateId(): string {
    return `agent_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  }

  protected generateThreadId(): string {
    return `thread_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  }

  protected generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  }

  protected generateRunId(): string {
    return `run_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  }
}

/**
 * Agnostic Agent Framework
 *
 * This module provides a unified interface for working with AI agents
 * across different providers:
 *
 * - **OpenAI**: Full CRUD via Assistants API (sunsetting Aug 2026)
 * - **Anthropic**: Stateless - no persistent agents, client manages state
 * - **Glean**: Read-only - agents created in UI, executed via API
 * - **Dust**: Read-only - agents created in UI, executed via API
 * - **Local**: Full CRUD - we manage storage, any LLM for execution
 *
 * ## Usage
 *
 * ```typescript
 * import { getAgentService, createAgent } from '@/lib/agents'
 *
 * // Get service for a specific provider
 * const service = getAgentService('local')
 *
 * // Create an agent (local provider)
 * const agent = await service.createAgent({
 *   name: 'Code Assistant',
 *   instructions: 'You are a helpful coding assistant...',
 *   model: 'claude-sonnet-4-20250514',
 *   tools: [{ name: 'search', description: 'Search code', type: 'function' }],
 * })
 *
 * // Run the agent
 * const result = await service.run({
 *   agentId: agent.id,
 *   message: 'Help me refactor this function',
 * })
 *
 * // Stream responses
 * for await (const event of service.runStream({ agentId: agent.id, message: '...' })) {
 *   if (event.type === 'delta') console.log(event.content)
 * }
 * ```
 *
 * ## Architecture
 *
 * ```
 * ┌─────────────────────────────────────────────────────────────┐
 * │                    Agnostic Agent Framework                  │
 * ├─────────────────────────────────────────────────────────────┤
 * │                                                             │
 * │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
 * │  │   Agent     │  │   Thread    │  │    Run      │         │
 * │  │   Config    │  │  (Convo)    │  │  (Execution)│         │
 * │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
 * │         │                │                │                 │
 * │         └────────────────┴────────────────┘                 │
 * │                          │                                  │
 * │              ┌───────────┴───────────┐                      │
 * │              │    IAgentService      │                      │
 * │              └───────────┬───────────┘                      │
 * │                          │                                  │
 * │    ┌─────────┬───────────┼───────────┬─────────┐           │
 * │    ▼         ▼           ▼           ▼         ▼           │
 * │ ┌──────┐ ┌──────┐  ┌──────────┐ ┌──────┐ ┌──────┐         │
 * │ │OpenAI│ │Claude│  │  Local   │ │Glean │ │ Dust │         │
 * │ │Assist│ │(none)│  │(our DB)  │ │(API) │ │(API) │         │
 * │ └──────┘ └──────┘  └──────────┘ └──────┘ └──────┘         │
 * │                          │                                  │
 * │              ┌───────────┴───────────┐                      │
 * │              │   Storage Layer       │                      │
 * │              │ (Memory/DB/Redis)     │                      │
 * │              └───────────────────────┘                      │
 * │                                                             │
 * └─────────────────────────────────────────────────────────────┘
 * ```
 */

// Types
export * from './types'
export type {
  AgentProvider,
  ProviderCapabilities,
  AgentConfig,
  AgentThread,
  AgentMessage,
  AgentMessageContent,
  AgentTool,
  AgentDataSource,
  AgentRunRequest,
  AgentRunResult,
  AgentStreamEvent,
  AgentToolCall,
  AgentToolResult,
  AgentCitation,
  IAgentService,
} from './types'

// Services
export { BaseAgentService } from './base-service'
export { LocalAgentService, getLocalAgentService } from './local-service'

// =============================================================================
// Factory Function
// =============================================================================

import type { AgentProvider, IAgentService } from './types'
import { PROVIDER_CAPABILITIES, AgentOperationNotSupportedError } from './types'
import { getLocalAgentService } from './local-service'

/**
 * Get an agent service for the specified provider
 *
 * @param provider - The provider to use
 * @returns An IAgentService implementation
 * @throws AgentOperationNotSupportedError if provider not implemented
 *
 * @example
 * ```typescript
 * const service = getAgentService('local')
 * const agents = await service.listAgents()
 * ```
 */
export function getAgentService(provider: AgentProvider): IAgentService {
  switch (provider) {
    case 'local':
      return getLocalAgentService()

    case 'openai':
      // TODO: Implement OpenAI Assistants API service
      // Note: OpenAI Assistants API is being deprecated (sunset Aug 2026)
      // Consider using the new Responses API instead
      throw new AgentOperationNotSupportedError(
        'OpenAI agent service',
        provider
      )

    case 'anthropic':
      // Anthropic doesn't have a persistent agent API
      // Use 'local' provider with Anthropic models instead
      throw new AgentOperationNotSupportedError(
        'Anthropic agent service (use local provider with Anthropic models)',
        provider
      )

    case 'glean':
      // TODO: Implement read-only Glean agent wrapper
      // Glean agents are created in UI, can only read/execute via API
      throw new AgentOperationNotSupportedError(
        'Glean agent service',
        provider
      )

    case 'dust':
      // TODO: Implement read-only Dust agent wrapper
      // Dust agents are created in UI, can only read/execute via API
      throw new AgentOperationNotSupportedError(
        'Dust agent service',
        provider
      )

    default:
      throw new AgentOperationNotSupportedError(
        `Unknown provider: ${provider}`,
        provider
      )
  }
}

/**
 * Check if a provider supports a specific capability
 *
 * @example
 * ```typescript
 * if (supportsCapability('openai', 'createAgent')) {
 *   // Can create agents via OpenAI API
 * }
 * ```
 */
export function supportsCapability(
  provider: AgentProvider,
  capability: keyof typeof PROVIDER_CAPABILITIES.local
): boolean {
  return !!PROVIDER_CAPABILITIES[provider]?.[capability]
}

/**
 * Get the recommended provider for a use case
 *
 * @param requirements - What you need the agent to do
 * @returns Recommended provider and explanation
 */
export function recommendProvider(requirements: {
  needsPersistentAgents?: boolean
  needsServerThreads?: boolean
  needsCodeExecution?: boolean
  needsFileSearch?: boolean
  needsUnlimitedTools?: boolean
  preferredModel?: 'openai' | 'anthropic' | 'any'
}): { provider: AgentProvider; reason: string } {
  // If they need code execution, OpenAI is the only option with built-in support
  if (requirements.needsCodeExecution) {
    return {
      provider: 'openai',
      reason:
        'OpenAI Assistants API has built-in code interpreter. ' +
        'Note: API is sunsetting Aug 2026.',
    }
  }

  // If they prefer Anthropic models, use local provider
  if (requirements.preferredModel === 'anthropic') {
    return {
      provider: 'local',
      reason:
        'Local provider with Anthropic models gives full control. ' +
        'Anthropic API is stateless - no persistent agent configs.',
    }
  }

  // If they need everything and don't care about model, OpenAI has the most
  if (
    requirements.needsPersistentAgents &&
    requirements.needsServerThreads &&
    requirements.needsFileSearch
  ) {
    return {
      provider: 'openai',
      reason:
        'OpenAI Assistants API has the most built-in features. ' +
        'Note: API is sunsetting Aug 2026.',
    }
  }

  // Default: Local provider with any model
  return {
    provider: 'local',
    reason:
      'Local provider gives you full control over agent storage and can use any LLM. ' +
      'Best for flexibility and avoiding vendor lock-in.',
  }
}

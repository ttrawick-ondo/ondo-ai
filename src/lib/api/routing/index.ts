/**
 * Request Routing System
 *
 * Provides intelligent routing of chat requests to the optimal provider/model
 * based on request intent classification.
 */

import type { ChatCompletionRequest } from '@/types'
import type { AIProvider } from '@/types/model'
import {
  classifyRequest,
  adjustForMultiModal,
  type ClassificationResult,
  type RequestIntent,
} from './classifier'

export interface RouteResult {
  model: string
  provider: AIProvider
  wasAutoRouted: boolean
  classification?: ClassificationResult
}

export interface RoutingOptions {
  /** Enable automatic routing based on intent classification */
  autoRouting: boolean
  /** Confidence threshold for auto-routing decisions (0-1) */
  confidenceThreshold?: number
  /** Provider preferences by intent type */
  providerPreferences?: Partial<Record<RequestIntent, AIProvider>>
  /** Model overrides by intent type */
  modelOverrides?: Partial<Record<RequestIntent, string>>
}

// Default provider preferences
const DEFAULT_PROVIDER_PREFERENCES: Record<RequestIntent, AIProvider> = {
  knowledge_query: 'glean',
  code_task: 'anthropic',
  data_analysis: 'openai',
  action_request: 'glean',
  general_chat: 'anthropic',
}

// Default model preferences
const DEFAULT_MODEL_PREFERENCES: Record<RequestIntent, string> = {
  knowledge_query: 'glean-default',
  code_task: 'claude-sonnet-4-20250514',
  data_analysis: 'gpt-4o',
  action_request: 'glean-default',
  general_chat: 'claude-sonnet-4-20250514',
}

/**
 * Get routing configuration from environment
 */
export function getRoutingConfig(): {
  mode: 'rule_based' | 'llm_hybrid'
  confidenceThreshold: number
  autoRoutingEnabled: boolean
} {
  const mode = (process.env.ROUTING_MODE || 'rule_based') as 'rule_based' | 'llm_hybrid'
  const threshold = parseFloat(process.env.ROUTING_CONFIDENCE_THRESHOLD || '0.7')
  const autoEnabled = process.env.ENABLE_AUTO_ROUTING === 'true'

  return {
    mode,
    confidenceThreshold: isNaN(threshold) ? 0.7 : threshold,
    autoRoutingEnabled: autoEnabled,
  }
}

/**
 * Determine the route for a chat request
 */
export async function getRouteForRequest(
  request: ChatCompletionRequest,
  options: RoutingOptions
): Promise<RouteResult> {
  // If auto-routing is disabled, use the explicitly requested model
  if (!options.autoRouting) {
    return {
      model: request.model,
      provider: request.provider,
      wasAutoRouted: false,
    }
  }

  // Classify the request
  const envConfig = getRoutingConfig()
  let classification = await classifyRequest(request.messages, {
    mode: envConfig.mode,
    confidenceThreshold: options.confidenceThreshold || envConfig.confidenceThreshold,
  })

  // Adjust for multi-modal content
  classification = adjustForMultiModal(classification, request.messages)

  // Apply provider preferences if specified
  const providerPrefs = { ...DEFAULT_PROVIDER_PREFERENCES, ...options.providerPreferences }
  const modelOverrides = { ...DEFAULT_MODEL_PREFERENCES, ...options.modelOverrides }

  const provider = providerPrefs[classification.intent]
  const model = modelOverrides[classification.intent] || classification.suggestedModel

  return {
    model,
    provider,
    wasAutoRouted: true,
    classification,
  }
}

/**
 * Map intent to the appropriate routing action
 */
export function mapIntentToRoute(
  classification: ClassificationResult,
  preferences?: Partial<Record<RequestIntent, AIProvider>>
): RouteResult {
  const providerPrefs = { ...DEFAULT_PROVIDER_PREFERENCES, ...preferences }
  const provider = providerPrefs[classification.intent]
  const model = DEFAULT_MODEL_PREFERENCES[classification.intent] || classification.suggestedModel

  return {
    model,
    provider,
    wasAutoRouted: true,
    classification,
  }
}

// Re-export types and functions from classifier
export type { ClassificationResult, RequestIntent } from './classifier'
export { classifyRequest, hasMultiModalContent, adjustForMultiModal } from './classifier'

// Re-export knowledge router
export {
  handleKnowledgeQuery,
  streamKnowledgeQuery,
  shouldUseKnowledgeRouter,
  type KnowledgeQueryOptions,
} from './knowledge-router'

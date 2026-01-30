/**
 * Request Classification System
 *
 * Classifies incoming requests to determine the optimal provider/model routing.
 * Uses rule-based patterns for fast, cost-free classification.
 */

import type { ChatCompletionMessage } from '@/types'
import type { AIProvider } from '@/types/model'

export type RequestIntent =
  | 'knowledge_query' // Enterprise knowledge search → Glean
  | 'code_task' // Code generation/debugging → Claude
  | 'data_analysis' // Data/math tasks → GPT-4
  | 'action_request' // External system actions → Glean Agent / Custom endpoints
  | 'general_chat' // General conversation → Default model

export interface ClassificationResult {
  intent: RequestIntent
  confidence: number
  suggestedProvider: AIProvider
  suggestedModel: string
  reasoning: string
}

export interface ClassificationConfig {
  mode: 'rule_based' | 'llm_hybrid'
  confidenceThreshold: number
}

// Pattern groups for rule-based classification
const KNOWLEDGE_PATTERNS: RegExp[] = [
  // Explicit knowledge queries
  /what\s+is|what\s+are|what's/i,
  /how\s+do\s+(i|we)|how\s+does|how\s+to/i,
  /explain\s+|tell\s+me\s+about/i,
  /find\s+(me\s+)?.*documentation|search\s+for/i,

  // Company/process queries
  /company\s+policy|our\s+policy|the\s+policy/i,
  /procedure\s+for|process\s+for|guidelines?\s+for/i,
  /who\s+(is|are|can)|where\s+(is|can|do)/i,
  /when\s+(is|was|did)/i,

  // Knowledge base indicators
  /confluence|notion|sharepoint|wiki/i,
  /documentation|docs\s+for|spec\s+for/i,
  /knowledge\s+base|internal\s+docs/i,

  // Question patterns
  /^(what|who|where|when|why|which|how)\b/i,
]

const CODE_PATTERNS: RegExp[] = [
  // Explicit code tasks
  /write\s+(me\s+)?.*code|implement\s+|create\s+.*function/i,
  /refactor\s+|optimize\s+.*code|debug\s+|fix\s+(the\s+)?bug/i,
  /build\s+.*component|add\s+.*feature/i,

  // Programming language indicators
  /typescript|javascript|python|react|nextjs|node\.?js/i,
  /rust|golang|java|c\+\+|c#|ruby|php|swift|kotlin/i,
  /html|css|sql|graphql|rest\s+api/i,

  // Code-related terms
  /function|class|component|module|interface|type/i,
  /variable|constant|enum|struct|method/i,
  /algorithm|data\s+structure|design\s+pattern/i,
  /test\s+case|unit\s+test|integration\s+test/i,

  // File indicators
  /\.(ts|tsx|js|jsx|py|rs|go|java|rb|php|swift|kt)$/i,
  /package\.json|tsconfig|dockerfile|makefile/i,
]

const DATA_ANALYSIS_PATTERNS: RegExp[] = [
  // Analysis requests
  /analyze\s+(this|the)?\s*data|data\s+analysis/i,
  /calculate|compute|sum|average|mean|median/i,
  /statistics|statistical|regression|correlation/i,

  // Chart/visualization
  /create\s+(a\s+)?chart|graph|plot|visualize/i,
  /spreadsheet|excel|csv|json\s+data/i,

  // Math operations
  /math|equation|formula|solve\s+for/i,
  /percentage|ratio|proportion|probability/i,

  // Business analysis
  /report\s+on|summarize\s+.*data|metrics|kpi/i,
  /trend|forecast|prediction|projection/i,
]

const ACTION_PATTERNS: RegExp[] = [
  // CRUD operations on external systems
  /create\s+(a\s+)?(jira|ticket|issue|task)/i,
  /update\s+(the\s+)?(record|entry|contact|deal)/i,
  /send\s+(an?\s+)?email|slack\s+message|notification/i,
  /schedule\s+(a\s+)?meeting|calendar/i,

  // System integrations
  /hubspot|salesforce|jira|confluence|slack/i,
  /zendesk|intercom|freshdesk|servicenow/i,
  /zapier|make|automate/i,

  // Action verbs with external targets
  /post\s+to|push\s+to|sync\s+with/i,
  /trigger\s+(a\s+)?workflow|run\s+(the\s+)?automation/i,
]

/**
 * Extract the latest user message content for classification
 */
function extractLatestUserContent(messages: ChatCompletionMessage[]): string {
  // Find the last user message
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    if (msg.role === 'user') {
      if (typeof msg.content === 'string') {
        return msg.content
      }
      // Handle content parts
      const textPart = msg.content?.find((p) => p.type === 'text')
      if (textPart && 'text' in textPart) {
        return textPart.text
      }
    }
  }
  return ''
}

/**
 * Calculate pattern match score
 */
function calculatePatternScore(
  content: string,
  patterns: RegExp[]
): { matches: number; score: number } {
  let matches = 0
  for (const pattern of patterns) {
    if (pattern.test(content)) {
      matches++
    }
  }
  // Score is matches normalized by total patterns, capped at 1.0
  const score = Math.min(matches / Math.max(patterns.length * 0.2, 1), 1.0)
  return { matches, score }
}

/**
 * Get default model for a provider
 */
function getDefaultModelForProvider(provider: AIProvider): string {
  const defaults: Record<AIProvider, string> = {
    glean: 'glean-default',
    anthropic: 'claude-sonnet-4-20250514',
    openai: 'gpt-4o',
    dust: 'dust-default',
    ondobot: 'ondobot-default',
  }
  return defaults[provider]
}

/**
 * Rule-based request classification
 */
function classifyWithRules(content: string): ClassificationResult {
  const knowledge = calculatePatternScore(content, KNOWLEDGE_PATTERNS)
  const code = calculatePatternScore(content, CODE_PATTERNS)
  const analysis = calculatePatternScore(content, DATA_ANALYSIS_PATTERNS)
  const action = calculatePatternScore(content, ACTION_PATTERNS)

  // Find the highest scoring intent
  const scores: Array<{ intent: RequestIntent; score: number; matches: number }> = [
    { intent: 'knowledge_query', score: knowledge.score, matches: knowledge.matches },
    { intent: 'code_task', score: code.score, matches: code.matches },
    { intent: 'data_analysis', score: analysis.score, matches: analysis.matches },
    { intent: 'action_request', score: action.score, matches: action.matches },
  ]

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score)

  const topScore = scores[0]
  const secondScore = scores[1]

  // If no strong signals, default to general_chat
  if (topScore.matches === 0) {
    return {
      intent: 'general_chat',
      confidence: 0.5,
      suggestedProvider: 'anthropic',
      suggestedModel: 'claude-sonnet-4-20250514',
      reasoning: 'No strong intent signals detected, defaulting to general chat.',
    }
  }

  // Calculate confidence based on separation from next best
  const separation = topScore.score - (secondScore?.score || 0)
  const confidence = Math.min(0.5 + separation + topScore.score * 0.3, 0.95)

  // Map intent to provider
  const providerMap: Record<RequestIntent, AIProvider> = {
    knowledge_query: 'glean',
    code_task: 'anthropic',
    data_analysis: 'openai',
    action_request: 'glean',
    general_chat: 'anthropic',
  }

  const provider = providerMap[topScore.intent]

  return {
    intent: topScore.intent,
    confidence,
    suggestedProvider: provider,
    suggestedModel: getDefaultModelForProvider(provider),
    reasoning: `Matched ${topScore.matches} patterns for ${topScore.intent} (score: ${topScore.score.toFixed(2)}).`,
  }
}

/**
 * Classify a chat request to determine routing
 */
export async function classifyRequest(
  messages: ChatCompletionMessage[],
  config: ClassificationConfig = { mode: 'rule_based', confidenceThreshold: 0.7 }
): Promise<ClassificationResult> {
  const content = extractLatestUserContent(messages)

  if (!content.trim()) {
    return {
      intent: 'general_chat',
      confidence: 1.0,
      suggestedProvider: 'anthropic',
      suggestedModel: 'claude-sonnet-4-20250514',
      reasoning: 'Empty message content.',
    }
  }

  // For now, only rule-based classification
  // LLM hybrid can be added later for ambiguous cases
  const result = classifyWithRules(content)

  // If confidence is below threshold and LLM hybrid mode is enabled,
  // we could invoke a small model to clarify intent
  // For now, we just return the rule-based result
  if (config.mode === 'llm_hybrid' && result.confidence < config.confidenceThreshold) {
    // TODO: Implement LLM clarification for ambiguous cases
    // This would use a fast, cheap model to confirm intent
    result.reasoning += ' (Below confidence threshold, consider LLM verification.)'
  }

  return result
}

/**
 * Check if a message contains indicators of multi-modal content
 * (images, files) that may affect routing
 */
export function hasMultiModalContent(messages: ChatCompletionMessage[]): boolean {
  return messages.some((msg) => {
    if (msg.images && msg.images.length > 0) return true
    if (msg.files && msg.files.length > 0) return true
    if (Array.isArray(msg.content)) {
      return msg.content.some((part) => part.type === 'image_url')
    }
    return false
  })
}

/**
 * Adjust classification for multi-modal content
 */
export function adjustForMultiModal(
  result: ClassificationResult,
  messages: ChatCompletionMessage[]
): ClassificationResult {
  if (!hasMultiModalContent(messages)) {
    return result
  }

  // If there's image content, prefer vision-capable models
  // GPT-4o and Claude have good vision capabilities
  if (result.suggestedProvider === 'glean') {
    // Glean doesn't support vision, route to Claude for analysis + knowledge
    return {
      ...result,
      suggestedProvider: 'anthropic',
      suggestedModel: 'claude-sonnet-4-20250514',
      reasoning: result.reasoning + ' Adjusted for multi-modal content (vision required).',
    }
  }

  return result
}

/**
 * Chat Streaming Service
 *
 * Handles the streaming chat flow including tool call execution loops.
 * Extracted from chatStore for better separation of concerns.
 */

import type {
  Message,
  AIProvider,
  ToolCall,
  ToolExecutionRecord,
  ImageAttachment,
  FileAttachment,
  MessageRole,
  ChatCompletionMessage,
  OndoBotStructuredResult,
} from '@/types'
import { generateId } from '@/lib/utils'
import { chatClient, type RoutingInfo } from '@/lib/api/client'
import { conversationApi } from '@/lib/api/client/conversations'
import { executeToolCalls as executeToolCallsService, getToolsConfig } from './tool-execution'

// ============================================================================
// Types
// ============================================================================

export type ChatMessage = ChatCompletionMessage

export interface StreamingConfig {
  conversationId: string
  messages: ChatMessage[]
  provider: AIProvider
  modelId: string
  tools?: string[]
  toolChoice?: 'auto' | 'none' | 'required' | { type: 'function'; function: { name: string } }
  routingOptions?: {
    autoRouting?: boolean
    confidenceThreshold?: number
    providerPreferences?: Record<string, string>
  }
}

export interface StreamingCallbacks {
  onStreamStart: () => void
  onStreamDelta: (delta: string, fullContent: string) => void
  onStreamComplete: () => void
  onMessageCreated: (message: Message) => void
  onMessagePersisted: (clientId: string, dbId: string) => void
  onToolsExecuting: (toolCalls: ToolCall[]) => void
  onToolsComplete: (results: ToolExecutionRecord[]) => void
  onRoutingInfo: (info: RoutingInfo) => void
  onError: (error: string) => void
}

export interface StreamingResult {
  success: boolean
  finalMessage?: Message
  error?: string
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Determine provider from model ID
 */
export function getProviderFromModelId(modelId: string): AIProvider {
  if (modelId.startsWith('gpt-')) return 'openai'
  if (modelId.startsWith('glean-')) return 'glean'
  if (modelId.startsWith('dust-')) return 'dust'
  if (modelId.startsWith('ondobot-')) return 'ondobot'
  return 'anthropic'
}

/**
 * Build API messages from Message array
 */
export function buildApiMessages(messages: Message[]): ChatMessage[] {
  return messages.map((msg): ChatMessage => {
    const images = msg.attachments?.filter((a) => a.type === 'image') as ImageAttachment[] | undefined
    const files = msg.attachments?.filter((a) => a.type === 'file') as FileAttachment[] | undefined

    return {
      role: msg.role as MessageRole,
      content: msg.content,
      ...(msg.tool_calls && { tool_calls: msg.tool_calls }),
      ...(msg.tool_call_id && { tool_call_id: msg.tool_call_id }),
      ...(images && images.length > 0 && { images }),
      ...(files && files.length > 0 && { files }),
    }
  })
}

/**
 * Create a user message
 */
export function createUserMessage(
  conversationId: string,
  content: string,
  attachments?: Array<{ type: string; name: string; url: string; mimeType: string; size: number; [key: string]: unknown }>
): Message {
  return {
    id: `msg-${generateId()}`,
    conversationId,
    role: 'user',
    content,
    attachments: attachments?.map((a) => ({ ...a, id: generateId() })) as Message['attachments'],
    createdAt: new Date(),
  }
}

/**
 * Create an assistant message
 */
export function createAssistantMessage(
  conversationId: string,
  content: string,
  options?: {
    toolCalls?: ToolCall[]
    model?: string
    tokenCount?: number
    processingTimeMs?: number
    routing?: {
      intent?: string
      confidence?: number
      wasAutoRouted?: boolean
      routedBy?: string
    }
    // OndoBot structured result data for rich UI rendering
    ondoBotStructured?: OndoBotStructuredResult
  }
): Message {
  return {
    id: `msg-${generateId()}`,
    conversationId,
    role: 'assistant',
    content,
    tool_calls: options?.toolCalls,
    metadata: {
      model: options?.model,
      tokenCount: options?.tokenCount,
      processingTimeMs: options?.processingTimeMs,
      routing: options?.routing,
      ondoBotStructured: options?.ondoBotStructured,
    },
    createdAt: new Date(),
  }
}

/**
 * Create a tool response message
 */
export function createToolMessage(
  conversationId: string,
  toolCallId: string,
  result: ToolExecutionRecord
): Message {
  return {
    id: `msg-${generateId()}`,
    conversationId,
    role: 'tool',
    content: result.result.success ? result.result.output : (result.result.error || 'Tool execution failed'),
    tool_call_id: toolCallId,
    tool_executions: [result],
    createdAt: new Date(),
  }
}

// ============================================================================
// Persistence Functions
// ============================================================================

/**
 * Persist a message to the database and return the database ID
 */
export async function persistMessage(
  conversationId: string,
  message: Message,
  options?: {
    provider?: AIProvider
    inputTokens?: number
    outputTokens?: number
    toolCalls?: ToolCall[]
  }
): Promise<string> {
  try {
    const dbMessage = await conversationApi.createMessage(conversationId, {
      role: message.role,
      content: message.content,
      ...(message.role === 'assistant' && {
        model: message.metadata?.model,
        provider: options?.provider,
        inputTokens: options?.inputTokens,
        outputTokens: options?.outputTokens,
        toolCalls: options?.toolCalls as unknown as Record<string, unknown>[],
        metadata: message.metadata as Record<string, unknown>,
      }),
      ...(message.role === 'tool' && {
        toolCallId: message.tool_call_id,
        metadata: { tool_executions: message.tool_executions },
      }),
      ...(message.role === 'user' && message.attachments && {
        attachments: message.attachments.map((a) => ({
          type: a.type,
          url: a.url,
          name: a.name,
          ...(a.type === 'image' && { width: (a as ImageAttachment).width, height: (a as ImageAttachment).height }),
          ...(a.type === 'file' && { size: (a as FileAttachment).size, mimeType: (a as FileAttachment).mimeType }),
        })),
      }),
    })
    return dbMessage.id
  } catch (error) {
    console.error('Failed to persist message:', error)
    throw error
  }
}

// ============================================================================
// Main Streaming Function
// ============================================================================

/**
 * Execute a streaming chat request with tool call support
 */
export async function streamChat(
  config: StreamingConfig,
  callbacks: StreamingCallbacks
): Promise<StreamingResult> {
  const { conversationId, provider, modelId, tools = [], toolChoice, routingOptions } = config
  let apiMessages = [...config.messages]
  const toolsConfig = getToolsConfig(tools)

  // Recursive function to handle tool calls
  const processResponse = async (): Promise<StreamingResult> => {
    let fullResponse = ''
    let receivedToolCalls: ToolCall[] = []
    let routingInfo: RoutingInfo | undefined
    let finalMessage: Message | undefined

    return new Promise((resolve) => {
      chatClient.stream(
        {
          conversationId,
          messages: apiMessages,
          provider,
          model: modelId,
          options: {
            tools: toolsConfig,
            tool_choice: toolChoice,
          },
        },
        {
          onStart: () => {
            callbacks.onStreamStart()
          },
          onDelta: (delta) => {
            fullResponse += delta
            callbacks.onStreamDelta(delta, fullResponse)
          },
          onRoutingInfo: (info) => {
            routingInfo = info
            callbacks.onRoutingInfo(info)
          },
          onDone: async (response) => {
            try {
              // Check if response contains tool calls
              if (response.message.tool_calls && response.message.tool_calls.length > 0) {
                receivedToolCalls = response.message.tool_calls

                // Create assistant message with tool calls
                const assistantMessage = createAssistantMessage(conversationId, response.message.content || '', {
                  toolCalls: receivedToolCalls,
                  model: response.metadata.model,
                  tokenCount: response.usage.totalTokens,
                  processingTimeMs: response.metadata.processingTimeMs,
                  routing: routingInfo ? {
                    intent: routingInfo.intent,
                    confidence: routingInfo.confidence,
                    wasAutoRouted: routingInfo.wasAutoRouted,
                    routedBy: routingInfo.routedBy,
                  } : undefined,
                  ondoBotStructured: response.metadata.ondoBotStructured as OndoBotStructuredResult | undefined,
                })

                callbacks.onMessageCreated(assistantMessage)

                // Persist assistant message
                const assistantClientId = assistantMessage.id
                persistMessage(conversationId, assistantMessage, {
                  provider,
                  inputTokens: response.usage.inputTokens,
                  outputTokens: response.usage.outputTokens,
                  toolCalls: receivedToolCalls,
                })
                  .then((dbId) => callbacks.onMessagePersisted(assistantClientId, dbId))
                  .catch(console.error)

                // Execute tool calls
                callbacks.onToolsExecuting(receivedToolCalls)
                const toolResults = await executeToolCallsService(receivedToolCalls, { parallel: true })
                callbacks.onToolsComplete(toolResults)

                // Create tool response messages
                const toolMessages = toolResults.map((result) =>
                  createToolMessage(conversationId, result.id, result)
                )

                for (const toolMsg of toolMessages) {
                  callbacks.onMessageCreated(toolMsg)
                  const toolClientId = toolMsg.id
                  persistMessage(conversationId, toolMsg)
                    .then((dbId) => callbacks.onMessagePersisted(toolClientId, dbId))
                    .catch(console.error)
                }

                // Update apiMessages for next iteration
                apiMessages = [
                  ...apiMessages,
                  {
                    role: 'assistant',
                    content: response.message.content || '',
                    tool_calls: receivedToolCalls,
                  },
                  ...toolMessages.map((tm) => ({
                    role: 'tool' as const,
                    content: tm.content,
                    tool_call_id: tm.tool_call_id!,
                  })),
                ]

                // Recursively process next response
                const result = await processResponse()
                resolve(result)
              } else {
                // No tool calls, create final assistant message
                finalMessage = createAssistantMessage(conversationId, response.message.content || fullResponse, {
                  model: response.metadata.model,
                  tokenCount: response.usage.totalTokens,
                  processingTimeMs: response.metadata.processingTimeMs,
                  routing: routingInfo ? {
                    intent: routingInfo.intent,
                    confidence: routingInfo.confidence,
                    wasAutoRouted: routingInfo.wasAutoRouted,
                    routedBy: routingInfo.routedBy,
                  } : undefined,
                  ondoBotStructured: response.metadata.ondoBotStructured as OndoBotStructuredResult | undefined,
                })

                callbacks.onMessageCreated(finalMessage)
                callbacks.onStreamComplete()

                // Persist final message
                const finalClientId = finalMessage.id
                persistMessage(conversationId, finalMessage, {
                  provider,
                  inputTokens: response.usage.inputTokens,
                  outputTokens: response.usage.outputTokens,
                })
                  .then((dbId) => callbacks.onMessagePersisted(finalClientId, dbId))
                  .catch(console.error)

                resolve({ success: true, finalMessage })
              }
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : 'Unknown error'
              callbacks.onError(errorMsg)
              resolve({ success: false, error: errorMsg })
            }
          },
          onError: (error) => {
            callbacks.onError(error)
            resolve({ success: false, error })
          },
        },
        {},
        routingOptions
      )
    })
  }

  return processResponse()
}

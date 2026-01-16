import OpenAI from 'openai'
import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  StreamEvent,
  TokenUsage,
} from '@/types'
import type { ToolCall } from '@/types/tools'
import { BaseProvider } from './base'
import { getModelConfig } from '../config/providers'
import { handleProviderError, ModelNotFoundError } from '../errors/apiErrors'
import {
  createStartEvent,
  createDeltaEvent,
  createDoneEvent,
  createErrorEvent,
  createToolCallDeltaEvent,
  createToolCallsDoneEvent,
} from '../streaming/encoder'

export class OpenAIProvider extends BaseProvider {
  provider = 'openai' as const
  private client: OpenAI | null = null

  private getClient(): OpenAI {
    if (!this.client) {
      this.client = new OpenAI({
        apiKey: this.getApiKey(),
      })
    }
    return this.client
  }

  protected async healthCheck(): Promise<void> {
    const client = this.getClient()
    await client.models.list()
  }

  async complete(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const startTime = Date.now()
    const model = getModelConfig(request.model)

    if (!model || model.provider !== 'openai') {
      throw new ModelNotFoundError(request.model, 'openai')
    }

    try {
      const client = this.getClient()

      const messages = this.buildMessages(request)

      const requestParams: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
        model: request.model,
        messages,
        temperature: request.options?.temperature ?? 0.7,
        max_tokens: request.options?.maxTokens ?? model.capabilities.maxOutputTokens,
        top_p: request.options?.topP,
      }

      // Add tools if provided
      if (request.options?.tools && request.options.tools.length > 0) {
        requestParams.tools = request.options.tools.map((tool) => ({
          type: 'function' as const,
          function: {
            name: tool.function.name,
            description: tool.function.description,
            parameters: tool.function.parameters as unknown as Record<string, unknown>,
          },
        }))

        if (request.options.tool_choice) {
          requestParams.tool_choice = request.options.tool_choice
        }

        if (request.options.parallel_tool_calls !== undefined) {
          requestParams.parallel_tool_calls = request.options.parallel_tool_calls
        }
      }

      const response = await client.chat.completions.create(requestParams)

      const usage: TokenUsage = {
        inputTokens: response.usage?.prompt_tokens ?? 0,
        outputTokens: response.usage?.completion_tokens ?? 0,
        totalTokens: response.usage?.total_tokens ?? 0,
      }

      usage.estimatedCost = this.calculateCost(usage, model)

      const assistantMessage = response.choices[0]?.message
      const toolCalls = this.mapToolCalls(assistantMessage?.tool_calls)

      return {
        id: response.id,
        message: {
          role: 'assistant',
          content: assistantMessage?.content ?? null,
          ...(toolCalls.length > 0 && { tool_calls: toolCalls }),
        },
        metadata: {
          model: request.model,
          provider: 'openai',
          processingTimeMs: Date.now() - startTime,
          finishReason: this.mapFinishReason(response.choices[0]?.finish_reason),
        },
        usage,
      }
    } catch (error) {
      throw handleProviderError(error, 'openai')
    }
  }

  private buildMessages(
    request: ChatCompletionRequest
  ): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = []

    if (request.options?.systemPrompt) {
      messages.push({
        role: 'system',
        content: request.options.systemPrompt,
      })
    }

    for (const msg of request.messages) {
      if (msg.role === 'tool' && msg.tool_call_id) {
        // Tool response message
        messages.push({
          role: 'tool',
          content: typeof msg.content === 'string' ? msg.content : '',
          tool_call_id: msg.tool_call_id,
        })
      } else if (msg.role === 'assistant' && msg.tool_calls && msg.tool_calls.length > 0) {
        // Assistant message with tool calls
        messages.push({
          role: 'assistant',
          content: typeof msg.content === 'string' ? msg.content : null,
          tool_calls: msg.tool_calls.map((tc) => ({
            id: tc.id,
            type: 'function' as const,
            function: {
              name: tc.function.name,
              arguments: tc.function.arguments,
            },
          })),
        })
      } else if (msg.role === 'user' && (msg.images?.length || msg.files?.length)) {
        // User message with images or files
        const contentParts: OpenAI.Chat.Completions.ChatCompletionContentPart[] = []

        // Add text content first if present
        let textContent = typeof msg.content === 'string' ? msg.content : ''

        // Append file contents to text
        if (msg.files && msg.files.length > 0) {
          const fileContents = msg.files
            .filter((f) => f.content && f.status === 'ready')
            .map((f) => {
              if (f.fileType === 'code' && f.language) {
                return `\n\n--- File: ${f.name} ---\n\`\`\`${f.language}\n${f.content}\n\`\`\``
              }
              return `\n\n--- File: ${f.name} ---\n${f.content}`
            })
            .join('\n')

          if (fileContents) {
            textContent = textContent + fileContents
          }
        }

        if (textContent) {
          contentParts.push({
            type: 'text',
            text: textContent,
          })
        }

        // Add images
        if (msg.images) {
          for (const image of msg.images) {
            contentParts.push({
              type: 'image_url',
              image_url: {
                url: image.base64 || image.url,
                detail: image.detail || 'auto',
              },
            })
          }
        }

        messages.push({
          role: 'user',
          content: contentParts.length > 0 ? contentParts : '',
        })
      } else if (Array.isArray(msg.content)) {
        // Already multi-modal content
        messages.push({
          role: msg.role as 'user',
          content: msg.content.map((part) => {
            if (part.type === 'text') {
              return { type: 'text' as const, text: part.text }
            } else {
              return {
                type: 'image_url' as const,
                image_url: {
                  url: part.image_url.url,
                  detail: part.image_url.detail || 'auto',
                },
              }
            }
          }),
        })
      } else {
        // Regular text message - also handle file attachments
        let content = typeof msg.content === 'string' ? msg.content : (msg.content ?? '')

        // Append file contents for user messages with files but no images
        if (msg.role === 'user' && msg.files && msg.files.length > 0) {
          const fileContents = msg.files
            .filter((f) => f.content && f.status === 'ready')
            .map((f) => {
              if (f.fileType === 'code' && f.language) {
                return `\n\n--- File: ${f.name} ---\n\`\`\`${f.language}\n${f.content}\n\`\`\``
              }
              return `\n\n--- File: ${f.name} ---\n${f.content}`
            })
            .join('\n')

          if (fileContents) {
            content = content + fileContents
          }
        }

        messages.push({
          role: msg.role as 'user' | 'assistant' | 'system',
          content: content,
        })
      }
    }

    return messages
  }

  private mapToolCalls(
    toolCalls?: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[]
  ): ToolCall[] {
    if (!toolCalls) return []

    return toolCalls
      .filter((tc): tc is OpenAI.Chat.Completions.ChatCompletionMessageToolCall & { type: 'function' } =>
        tc.type === 'function' && 'function' in tc
      )
      .map((tc) => ({
        id: tc.id,
        type: 'function' as const,
        function: {
          name: tc.function.name,
          arguments: tc.function.arguments,
        },
      }))
  }

  async *stream(request: ChatCompletionRequest): AsyncGenerator<StreamEvent> {
    const startTime = Date.now()
    const model = getModelConfig(request.model)

    if (!model || model.provider !== 'openai') {
      throw new ModelNotFoundError(request.model, 'openai')
    }

    const id = this.generateId()
    yield createStartEvent(id)

    try {
      const client = this.getClient()

      const messages = this.buildMessages(request)

      const requestParams: OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming = {
        model: request.model,
        messages,
        temperature: request.options?.temperature ?? 0.7,
        max_tokens: request.options?.maxTokens ?? model.capabilities.maxOutputTokens,
        top_p: request.options?.topP,
        stream: true,
        stream_options: { include_usage: true },
      }

      // Add tools if provided
      if (request.options?.tools && request.options.tools.length > 0) {
        requestParams.tools = request.options.tools.map((tool) => ({
          type: 'function' as const,
          function: {
            name: tool.function.name,
            description: tool.function.description,
            parameters: tool.function.parameters as unknown as Record<string, unknown>,
          },
        }))

        if (request.options.tool_choice) {
          requestParams.tool_choice = request.options.tool_choice
        }

        if (request.options.parallel_tool_calls !== undefined) {
          requestParams.parallel_tool_calls = request.options.parallel_tool_calls
        }
      }

      const stream = await client.chat.completions.create(requestParams)

      let fullContent = ''
      let usage: TokenUsage = {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
      }
      let finishReason: ChatCompletionResponse['metadata']['finishReason'] = 'stop'

      // Accumulate tool calls during streaming
      const toolCallsAccumulator: Map<
        number,
        { id: string; type: 'function'; function: { name: string; arguments: string } }
      > = new Map()

      for await (const chunk of stream) {
        const choice = chunk.choices[0]
        const delta = choice?.delta

        // Handle content delta
        if (delta?.content) {
          fullContent += delta.content
          yield createDeltaEvent(delta.content)
        }

        // Handle tool call deltas
        if (delta?.tool_calls) {
          for (const toolCallDelta of delta.tool_calls) {
            const index = toolCallDelta.index

            // Initialize or update tool call accumulator
            if (!toolCallsAccumulator.has(index)) {
              toolCallsAccumulator.set(index, {
                id: toolCallDelta.id ?? '',
                type: 'function',
                function: {
                  name: toolCallDelta.function?.name ?? '',
                  arguments: toolCallDelta.function?.arguments ?? '',
                },
              })
            } else {
              const existing = toolCallsAccumulator.get(index)!
              if (toolCallDelta.id) existing.id = toolCallDelta.id
              if (toolCallDelta.function?.name) existing.function.name += toolCallDelta.function.name
              if (toolCallDelta.function?.arguments)
                existing.function.arguments += toolCallDelta.function.arguments
            }

            // Emit tool call delta event
            yield createToolCallDeltaEvent(index, {
              id: toolCallDelta.id,
              type: toolCallDelta.type,
              function: toolCallDelta.function,
            })
          }
        }

        if (choice?.finish_reason) {
          finishReason = this.mapFinishReason(choice.finish_reason)
        }

        if (chunk.usage) {
          usage = {
            inputTokens: chunk.usage.prompt_tokens,
            outputTokens: chunk.usage.completion_tokens,
            totalTokens: chunk.usage.total_tokens,
          }
        }
      }

      usage.estimatedCost = this.calculateCost(usage, model)

      // Convert accumulated tool calls to array
      const toolCalls: ToolCall[] = Array.from(toolCallsAccumulator.values())

      // Emit done event with or without tool calls
      if (toolCalls.length > 0) {
        yield createToolCallsDoneEvent(fullContent || null, toolCalls, usage, {
          model: request.model,
          provider: 'openai',
          processingTimeMs: Date.now() - startTime,
          finishReason,
        })
      } else {
        yield createDoneEvent(fullContent, usage, {
          model: request.model,
          provider: 'openai',
          processingTimeMs: Date.now() - startTime,
          finishReason,
        })
      }
    } catch (error) {
      const apiError = handleProviderError(error, 'openai')
      yield createErrorEvent(apiError.message)
    }
  }

  private mapFinishReason(
    reason: string | null | undefined
  ): ChatCompletionResponse['metadata']['finishReason'] {
    switch (reason) {
      case 'stop':
        return 'stop'
      case 'length':
        return 'length'
      case 'content_filter':
        return 'content_filter'
      case 'tool_calls':
        return 'tool_calls'
      default:
        return 'stop'
    }
  }
}

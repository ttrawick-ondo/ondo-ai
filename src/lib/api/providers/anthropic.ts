import 'server-only'

import Anthropic from '@anthropic-ai/sdk'
import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatCompletionOptions,
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

export class AnthropicProvider extends BaseProvider {
  provider = 'anthropic' as const
  private client: Anthropic | null = null

  private getClient(): Anthropic {
    if (!this.client) {
      this.client = new Anthropic({
        apiKey: this.getApiKey(),
      })
    }
    return this.client
  }

  protected async healthCheck(): Promise<void> {
    // Anthropic doesn't have a dedicated health check endpoint
    // We'll verify the API key is set
    this.getApiKey()
  }

  async complete(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const startTime = Date.now()
    const model = getModelConfig(request.model)

    if (!model || model.provider !== 'anthropic') {
      throw new ModelNotFoundError(request.model, 'anthropic')
    }

    try {
      const client = this.getClient()

      // Build Anthropic message format with file support
      const messages: Anthropic.MessageParam[] = this.buildMessages(request)

      const requestParams: Anthropic.MessageCreateParams = {
        model: request.model,
        max_tokens: request.options?.maxTokens ?? model.capabilities.maxOutputTokens,
        system: request.options?.systemPrompt,
        messages,
        temperature: request.options?.temperature ?? 0.7,
        top_p: request.options?.topP,
      }

      // Add tools if provided
      if (request.options?.tools && request.options.tools.length > 0) {
        requestParams.tools = request.options.tools.map((tool) => ({
          name: tool.function.name,
          description: tool.function.description,
          input_schema: tool.function.parameters as Anthropic.Tool['input_schema'],
        }))

        // Map tool_choice if provided
        if (request.options.tool_choice) {
          requestParams.tool_choice = this.mapToolChoice(request.options.tool_choice)
        }
      }

      const response = await client.messages.create(requestParams)

      // Extract text content
      const content = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('')

      // Extract tool calls
      const toolCalls = this.extractToolCalls(response.content)

      const usage: TokenUsage = {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      }

      usage.estimatedCost = this.calculateCost(usage, model)

      return {
        id: response.id,
        message: {
          role: 'assistant',
          content: content || null,
          ...(toolCalls.length > 0 && { tool_calls: toolCalls }),
        },
        metadata: {
          model: request.model,
          provider: 'anthropic',
          processingTimeMs: Date.now() - startTime,
          finishReason: this.mapFinishReason(response.stop_reason),
        },
        usage,
      }
    } catch (error) {
      throw handleProviderError(error, 'anthropic')
    }
  }

  async *stream(request: ChatCompletionRequest): AsyncGenerator<StreamEvent> {
    const startTime = Date.now()
    const model = getModelConfig(request.model)

    if (!model || model.provider !== 'anthropic') {
      throw new ModelNotFoundError(request.model, 'anthropic')
    }

    const id = this.generateId()
    yield createStartEvent(id)

    try {
      const client = this.getClient()

      // Build Anthropic message format with file support
      const messages: Anthropic.MessageParam[] = this.buildMessages(request)

      const requestParams: Anthropic.MessageStreamParams = {
        model: request.model,
        max_tokens: request.options?.maxTokens ?? model.capabilities.maxOutputTokens,
        system: request.options?.systemPrompt,
        messages,
        temperature: request.options?.temperature ?? 0.7,
        top_p: request.options?.topP,
      }

      // Add tools if provided
      if (request.options?.tools && request.options.tools.length > 0) {
        requestParams.tools = request.options.tools.map((tool) => ({
          name: tool.function.name,
          description: tool.function.description,
          input_schema: tool.function.parameters as Anthropic.Tool['input_schema'],
        }))

        // Map tool_choice if provided
        if (request.options.tool_choice) {
          requestParams.tool_choice = this.mapToolChoice(request.options.tool_choice)
        }
      }

      const stream = await client.messages.stream(requestParams)

      let fullContent = ''
      let usage: TokenUsage = {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
      }
      let finishReason: ChatCompletionResponse['metadata']['finishReason'] = 'stop'

      // Track tool calls during streaming
      const toolCallsAccumulator: Map<
        number,
        { id: string; type: 'function'; function: { name: string; arguments: string } }
      > = new Map()
      let currentToolIndex = 0

      for await (const event of stream) {
        // Handle text content
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          const delta = event.delta.text
          fullContent += delta
          yield createDeltaEvent(delta)
        }

        // Handle tool use block start
        if (event.type === 'content_block_start' && event.content_block.type === 'tool_use') {
          const toolBlock = event.content_block
          toolCallsAccumulator.set(currentToolIndex, {
            id: toolBlock.id,
            type: 'function',
            function: {
              name: toolBlock.name,
              arguments: '',
            },
          })
          // Emit initial tool call delta
          yield createToolCallDeltaEvent(currentToolIndex, {
            id: toolBlock.id,
            type: 'function',
            function: {
              name: toolBlock.name,
            },
          })
        }

        // Handle tool use input delta
        if (event.type === 'content_block_delta' && event.delta.type === 'input_json_delta') {
          const existing = toolCallsAccumulator.get(currentToolIndex)
          if (existing) {
            existing.function.arguments += event.delta.partial_json
            // Emit tool call argument delta
            yield createToolCallDeltaEvent(currentToolIndex, {
              function: {
                arguments: event.delta.partial_json,
              },
            })
          }
        }

        // Handle content block stop (increment tool index after each block)
        if (event.type === 'content_block_stop') {
          // Check if the previous block was a tool_use
          const existing = toolCallsAccumulator.get(currentToolIndex)
          if (existing) {
            currentToolIndex++
          }
        }

        if (event.type === 'message_delta' && event.delta.stop_reason) {
          finishReason = this.mapFinishReason(event.delta.stop_reason)
        }

        if (event.type === 'message_delta' && event.usage) {
          usage.outputTokens = event.usage.output_tokens
        }

        if (event.type === 'message_start' && event.message.usage) {
          usage.inputTokens = event.message.usage.input_tokens
        }
      }

      usage.totalTokens = usage.inputTokens + usage.outputTokens
      usage.estimatedCost = this.calculateCost(usage, model)

      // Convert accumulated tool calls to array
      const toolCalls: ToolCall[] = Array.from(toolCallsAccumulator.values())

      // Emit done event with or without tool calls
      if (toolCalls.length > 0) {
        yield createToolCallsDoneEvent(fullContent || null, toolCalls, usage, {
          model: request.model,
          provider: 'anthropic',
          processingTimeMs: Date.now() - startTime,
          finishReason,
        })
      } else {
        yield createDoneEvent(fullContent, usage, {
          model: request.model,
          provider: 'anthropic',
          processingTimeMs: Date.now() - startTime,
          finishReason,
        })
      }
    } catch (error) {
      const apiError = handleProviderError(error, 'anthropic')
      yield createErrorEvent(apiError.message)
    }
  }

  private buildMessages(
    request: ChatCompletionRequest
  ): Anthropic.MessageParam[] {
    const messages: Anthropic.MessageParam[] = []

    for (const msg of request.messages) {
      // Handle tool result messages
      if (msg.role === 'tool' && msg.tool_call_id) {
        // Tool results in Anthropic are user messages with tool_result content blocks
        // Check if the previous message is already a user message with tool_result
        const lastMsg = messages[messages.length - 1]
        if (lastMsg && lastMsg.role === 'user' && Array.isArray(lastMsg.content)) {
          // Append to existing user message
          (lastMsg.content as Anthropic.ToolResultBlockParam[]).push({
            type: 'tool_result',
            tool_use_id: msg.tool_call_id,
            content: typeof msg.content === 'string' ? msg.content : '',
          })
        } else {
          // Create new user message with tool_result
          messages.push({
            role: 'user',
            content: [
              {
                type: 'tool_result',
                tool_use_id: msg.tool_call_id,
                content: typeof msg.content === 'string' ? msg.content : '',
              },
            ],
          })
        }
        continue
      }

      // Handle assistant messages with tool calls
      if (msg.role === 'assistant' && msg.tool_calls && msg.tool_calls.length > 0) {
        const contentBlocks: Anthropic.ContentBlockParam[] = []

        // Add text content if present
        if (typeof msg.content === 'string' && msg.content) {
          contentBlocks.push({
            type: 'text',
            text: msg.content,
          })
        }

        // Add tool use blocks
        for (const tc of msg.tool_calls) {
          let parsedInput: Record<string, unknown> = {}
          try {
            parsedInput = JSON.parse(tc.function.arguments)
          } catch {
            // Keep empty object if parsing fails
          }
          contentBlocks.push({
            type: 'tool_use',
            id: tc.id,
            name: tc.function.name,
            input: parsedInput,
          })
        }

        messages.push({
          role: 'assistant',
          content: contentBlocks,
        })
        continue
      }

      // Handle regular messages (original logic)
      const convertedMsg = this.convertRegularMessage(msg)
      if (convertedMsg) {
        messages.push(convertedMsg)
      }
    }

    return messages
  }

  private convertRegularMessage(
    msg: ChatCompletionRequest['messages'][0]
  ): Anthropic.MessageParam | null {
    // Skip tool messages (handled above)
    if (msg.role === 'tool') return null

    // Handle messages with images or files
    if (msg.role === 'user' && (msg.images?.length || msg.files?.length)) {
      const contentBlocks: Anthropic.ContentBlockParam[] = []

      // Add text content first if present
      let textContent = typeof msg.content === 'string' ? msg.content : ''

      // Append file contents
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
        contentBlocks.push({
          type: 'text',
          text: textContent,
        })
      }

      // Add images
      if (msg.images) {
        for (const image of msg.images) {
          // Extract base64 data and media type
          const base64Match = image.base64?.match(/^data:([^;]+);base64,(.+)$/)
          if (base64Match) {
            const mediaType = base64Match[1] as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
            const data = base64Match[2]
            contentBlocks.push({
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data,
              },
            })
          }
        }
      }

      return {
        role: 'user' as const,
        content: contentBlocks.length > 0 ? contentBlocks : '',
      }
    }

    // Handle array content (already multi-modal)
    if (Array.isArray(msg.content)) {
      const contentBlocks: Anthropic.ContentBlockParam[] = msg.content.map((part) => {
        if (part.type === 'text') {
          return { type: 'text' as const, text: part.text }
        } else {
          // Convert image_url to Anthropic format
          const base64Match = part.image_url.url.match(/^data:([^;]+);base64,(.+)$/)
          if (base64Match) {
            return {
              type: 'image' as const,
              source: {
                type: 'base64' as const,
                media_type: base64Match[1] as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                data: base64Match[2],
              },
            }
          }
          // Fallback - just use text
          return { type: 'text' as const, text: '[Image]' }
        }
      })
      return {
        role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
        content: contentBlocks,
      }
    }

    // Regular text message - also handle file attachments
    let content = (typeof msg.content === 'string' ? msg.content : '') || ''

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

    return {
      role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
      content,
    }
  }

  private extractToolCalls(content: Anthropic.ContentBlock[]): ToolCall[] {
    return content
      .filter((block): block is Anthropic.ToolUseBlock => block.type === 'tool_use')
      .map((block) => ({
        id: block.id,
        type: 'function' as const,
        function: {
          name: block.name,
          arguments: JSON.stringify(block.input),
        },
      }))
  }

  private mapToolChoice(
    choice: ChatCompletionOptions['tool_choice']
  ): Anthropic.MessageCreateParams['tool_choice'] {
    if (!choice) return undefined

    if (typeof choice === 'string') {
      switch (choice) {
        case 'auto':
          return { type: 'auto' }
        case 'none':
          // Anthropic doesn't have 'none', but we can emulate by not sending tools
          return undefined
        case 'required':
          return { type: 'any' }
        default:
          return { type: 'auto' }
      }
    }

    // Specific tool choice
    if (choice.type === 'function' && choice.function?.name) {
      return {
        type: 'tool',
        name: choice.function.name,
      }
    }

    return { type: 'auto' }
  }

  private mapFinishReason(
    reason: string | null | undefined
  ): ChatCompletionResponse['metadata']['finishReason'] {
    switch (reason) {
      case 'end_turn':
        return 'stop'
      case 'max_tokens':
        return 'length'
      case 'stop_sequence':
        return 'stop'
      case 'tool_use':
        return 'tool_calls'
      default:
        return 'stop'
    }
  }
}

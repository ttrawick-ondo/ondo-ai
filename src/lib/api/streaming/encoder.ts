import type { StreamEvent, StreamEventData, TokenUsage, ChatCompletionMetadata } from '@/types'
import type { Citation } from '@/types/chat'
import type { ToolCall } from '@/types/tools'

const encoder = new TextEncoder()

export function encodeSSEEvent(event: StreamEvent): Uint8Array {
  const data = JSON.stringify(event)
  return encoder.encode(`data: ${data}\n\n`)
}

export function createStreamEvent(
  type: StreamEvent['type'],
  data: StreamEventData
): StreamEvent {
  return {
    type,
    data,
    timestamp: Date.now(),
  }
}

export function createStartEvent(id: string): StreamEvent {
  return createStreamEvent('start', { id })
}

export function createDeltaEvent(delta: string): StreamEvent {
  return createStreamEvent('delta', { delta })
}

export function createDoneEvent(
  content: string,
  usage: TokenUsage,
  metadata: ChatCompletionMetadata,
  citations?: Citation[],
  thinking?: string
): StreamEvent {
  return createStreamEvent('done', {
    content, usage, metadata,
    ...(citations && { citations }),
    ...(thinking && { thinking }),
  })
}

export function createErrorEvent(error: string): StreamEvent {
  return createStreamEvent('error', { error })
}

export function createThinkingDeltaEvent(thinking: string): StreamEvent {
  return createStreamEvent('delta', { thinking })
}

export function createToolCallDeltaEvent(
  index: number,
  delta: {
    id?: string
    type?: 'function'
    function?: {
      name?: string
      arguments?: string
    }
  }
): StreamEvent {
  return createStreamEvent('delta', {
    tool_call_delta: {
      index,
      ...delta,
    },
  })
}

export function createToolCallsDoneEvent(
  content: string | null,
  toolCalls: ToolCall[],
  usage: TokenUsage,
  metadata: ChatCompletionMetadata
): StreamEvent {
  return createStreamEvent('done', {
    content: content ?? undefined,
    tool_calls: toolCalls,
    usage,
    metadata,
  })
}

export class SSEEncoder {
  private id: string

  constructor(id: string) {
    this.id = id
  }

  start(): Uint8Array {
    return encodeSSEEvent(createStartEvent(this.id))
  }

  delta(content: string): Uint8Array {
    return encodeSSEEvent(createDeltaEvent(content))
  }

  toolCallDelta(
    index: number,
    delta: {
      id?: string
      type?: 'function'
      function?: {
        name?: string
        arguments?: string
      }
    }
  ): Uint8Array {
    return encodeSSEEvent(createToolCallDeltaEvent(index, delta))
  }

  done(content: string, usage: TokenUsage, metadata: ChatCompletionMetadata): Uint8Array {
    return encodeSSEEvent(createDoneEvent(content, usage, metadata))
  }

  toolCallsDone(
    content: string | null,
    toolCalls: ToolCall[],
    usage: TokenUsage,
    metadata: ChatCompletionMetadata
  ): Uint8Array {
    return encodeSSEEvent(createToolCallsDoneEvent(content, toolCalls, usage, metadata))
  }

  error(message: string): Uint8Array {
    return encodeSSEEvent(createErrorEvent(message))
  }
}

export function createSSEStream(
  generator: AsyncGenerator<StreamEvent, void, unknown>
): ReadableStream<Uint8Array> {
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const event of generator) {
          controller.enqueue(encodeSSEEvent(event))
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        controller.enqueue(encodeSSEEvent(createErrorEvent(errorMessage)))
      } finally {
        controller.close()
      }
    },
  })
}

export function parseSSEResponse(data: string): StreamEvent | null {
  const lines = data.split('\n')

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const jsonStr = line.slice(6)
      if (jsonStr === '[DONE]') {
        return null
      }
      try {
        return JSON.parse(jsonStr) as StreamEvent
      } catch {
        return null
      }
    }
  }

  return null
}

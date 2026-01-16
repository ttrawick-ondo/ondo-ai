import { NextRequest, NextResponse } from 'next/server'
import type { ChatCompletionRequest } from '@/types'
import { getProviderForModel } from '@/lib/api/providers'
import { createSSEStream } from '@/lib/api/streaming/encoder'
import { APIError, ValidationError } from '@/lib/api/errors/apiErrors'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate request
    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      throw new ValidationError('Messages array is required and must not be empty')
    }

    if (!body.model) {
      throw new ValidationError('Model is required')
    }

    const chatRequest: ChatCompletionRequest = {
      conversationId: body.conversationId || 'default',
      messages: body.messages,
      provider: body.provider,
      model: body.model,
      options: {
        temperature: body.options?.temperature,
        maxTokens: body.options?.maxTokens,
        topP: body.options?.topP,
        stream: body.options?.stream ?? true,
        systemPrompt: body.options?.systemPrompt,
        // Tool-related options
        tools: body.options?.tools,
        tool_choice: body.options?.tool_choice,
        parallel_tool_calls: body.options?.parallel_tool_calls,
      },
    }

    const provider = getProviderForModel(chatRequest.model)

    // Check if streaming is requested
    if (chatRequest.options?.stream !== false) {
      const stream = createSSEStream(provider.stream(chatRequest))

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      })
    }

    // Non-streaming response
    const response = await provider.complete(chatRequest)

    return NextResponse.json(response)
  } catch (error) {
    if (error instanceof APIError) {
      return NextResponse.json(error.toJSON(), { status: error.statusCode })
    }

    console.error('Chat API error:', error)

    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}

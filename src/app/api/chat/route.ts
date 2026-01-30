import { NextRequest, NextResponse } from 'next/server'
import type { ChatCompletionRequest } from '@/types'
import { getProviderForModel } from '@/lib/api/providers'
import { createSSEStream } from '@/lib/api/streaming/encoder'
import { APIError, ValidationError } from '@/lib/api/errors/apiErrors'
import { chatLogger, logChatCompletion } from '@/lib/logging'
import { getRouteForRequest, getRoutingConfig } from '@/lib/api/routing'

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID()
  const startTime = Date.now()

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

    // Determine routing - check if auto-routing is enabled
    const routingConfig = getRoutingConfig()
    const autoRouting = body.options?.autoRouting ?? routingConfig.autoRoutingEnabled

    const route = await getRouteForRequest(chatRequest, {
      autoRouting,
      confidenceThreshold: routingConfig.confidenceThreshold,
      providerPreferences: body.options?.providerPreferences,
      modelOverrides: body.options?.modelOverrides,
    })

    // Update request with routed model/provider if auto-routed
    if (route.wasAutoRouted) {
      chatRequest.model = route.model
      chatRequest.provider = route.provider
    }

    const provider = getProviderForModel(chatRequest.model)

    chatLogger.info('Chat request received', {
      requestId,
      conversationId: chatRequest.conversationId,
      model: chatRequest.model,
      provider: chatRequest.provider || provider.provider,
      messageCount: chatRequest.messages.length,
      streaming: chatRequest.options?.stream !== false,
      hasTools: !!(chatRequest.options?.tools?.length),
      autoRouted: route.wasAutoRouted,
      intent: route.classification?.intent,
    })

    // Build routing headers for transparency
    const routingHeaders: Record<string, string> = {
      'X-Request-Id': requestId,
      'X-Routed-By': route.wasAutoRouted ? routingConfig.mode : 'explicit',
    }
    if (route.classification) {
      routingHeaders['X-Intent'] = route.classification.intent
      routingHeaders['X-Intent-Confidence'] = route.classification.confidence.toFixed(2)
    }

    // Check if streaming is requested
    if (chatRequest.options?.stream !== false) {
      const stream = createSSEStream(provider.stream(chatRequest))

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          ...routingHeaders,
        },
      })
    }

    // Non-streaming response
    const response = await provider.complete(chatRequest)

    logChatCompletion(chatRequest.conversationId, {
      provider: chatRequest.provider || provider.provider,
      model: chatRequest.model,
      inputTokens: response.usage?.inputTokens,
      outputTokens: response.usage?.outputTokens,
      duration: Date.now() - startTime,
      toolCalls: response.message.tool_calls?.length,
      success: true,
    })

    return NextResponse.json(response, { headers: routingHeaders })
  } catch (error) {
    const duration = Date.now() - startTime

    chatLogger.error('Chat request failed', {
      requestId,
      duration,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorCode: error instanceof APIError ? error.code : 'INTERNAL_ERROR',
    })

    if (error instanceof APIError) {
      return NextResponse.json(error.toJSON(), { status: error.statusCode })
    }

    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}

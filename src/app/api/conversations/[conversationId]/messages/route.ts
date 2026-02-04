import { NextRequest, NextResponse } from 'next/server'
import {
  getMessages,
  createMessage,
} from '@/lib/db/services/conversation'

type RouteContext = { params: Promise<{ conversationId: string }> }

// GET /api/conversations/[conversationId]/messages - Get messages for a conversation
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { conversationId } = await context.params
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')
    const before = searchParams.get('before')
    const after = searchParams.get('after')

    const messages = await getMessages(conversationId, {
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
      before: before ? new Date(before) : undefined,
      after: after ? new Date(after) : undefined,
    })

    return NextResponse.json({ data: messages })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}

// POST /api/conversations/[conversationId]/messages - Create a new message
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { conversationId } = await context.params
    const body = await request.json()
    const {
      userId,
      role,
      content,
      model,
      provider,
      inputTokens,
      outputTokens,
      estimatedCost,
      toolCalls,
      toolCallId,
      attachments,
      metadata,
    } = body

    if (!role || !content) {
      return NextResponse.json(
        { error: 'role and content are required' },
        { status: 400 }
      )
    }

    const message = await createMessage({
      conversationId,
      userId,
      role,
      content,
      model,
      provider,
      inputTokens,
      outputTokens,
      estimatedCost,
      toolCalls,
      toolCallId,
      attachments,
      metadata,
    })

    return NextResponse.json({ data: message }, { status: 201 })
  } catch (error) {
    console.error('Error creating message:', error)
    return NextResponse.json(
      { error: 'Failed to create message' },
      { status: 500 }
    )
  }
}

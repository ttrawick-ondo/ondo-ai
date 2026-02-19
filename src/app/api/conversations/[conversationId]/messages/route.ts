import { NextRequest, NextResponse } from 'next/server'
import {
  getMessages,
  createMessage,
  getConversation,
} from '@/lib/db/services/conversation'
import { validateWorkspaceAccess } from '@/lib/auth/workspace'
import { requireSession, unauthorizedResponse, forbiddenResponse } from '@/lib/auth/session'

type RouteContext = { params: Promise<{ conversationId: string }> }

/**
 * Verify the session user owns or has workspace access to a conversation.
 */
async function authorizeConversation(conversationId: string, sessionUserId: string) {
  const conversation = await getConversation(conversationId)
  if (!conversation) return { authorized: false, notFound: true } as const
  if (conversation.userId === sessionUserId) return { authorized: true } as const
  if (conversation.workspaceId) {
    const hasAccess = await validateWorkspaceAccess(conversation.workspaceId, sessionUserId)
    if (hasAccess) return { authorized: true } as const
  }
  return { authorized: false, notFound: false } as const
}

// GET /api/conversations/[conversationId]/messages - Get messages for a conversation
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await requireSession()
    if (!session) return unauthorizedResponse()

    const { conversationId } = await context.params

    const authResult = await authorizeConversation(conversationId, session.user.id)
    if (!authResult.authorized) {
      if ('notFound' in authResult && authResult.notFound) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
      }
      return forbiddenResponse()
    }

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
    const session = await requireSession()
    if (!session) return unauthorizedResponse()

    const { conversationId } = await context.params

    const authResult = await authorizeConversation(conversationId, session.user.id)
    if (!authResult.authorized) {
      if ('notFound' in authResult && authResult.notFound) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
      }
      return forbiddenResponse()
    }

    const body = await request.json()
    const {
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
      userId: session.user.id,
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

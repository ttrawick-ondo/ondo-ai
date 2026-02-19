import { NextRequest, NextResponse } from 'next/server'
import { branchConversation, getConversation } from '@/lib/db/services/conversation'
import { validateWorkspaceAccess } from '@/lib/auth/workspace'
import { requireSession, unauthorizedResponse, forbiddenResponse } from '@/lib/auth/session'

interface RouteParams {
  params: Promise<{
    conversationId: string
  }>
}

// POST /api/conversations/[conversationId]/branch - Create a branch from a conversation
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession()
    if (!session) return unauthorizedResponse()

    const { conversationId } = await params
    const body = await request.json()
    const { branchPointMessageId, title } = body

    if (!branchPointMessageId) {
      return NextResponse.json(
        { error: 'branchPointMessageId is required' },
        { status: 400 }
      )
    }

    // Verify access to the source conversation
    const conversation = await getConversation(conversationId)
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    if (conversation.userId !== session.user.id) {
      if (conversation.workspaceId) {
        const hasAccess = await validateWorkspaceAccess(conversation.workspaceId, session.user.id)
        if (!hasAccess) return forbiddenResponse()
      } else {
        return forbiddenResponse()
      }
    }

    const branchedConversation = await branchConversation({
      userId: session.user.id,
      sourceConversationId: conversationId,
      branchPointMessageId,
      title,
    })

    return NextResponse.json({ data: branchedConversation }, { status: 201 })
  } catch (error) {
    console.error('Error branching conversation:', error)
    return NextResponse.json(
      { error: 'Failed to branch conversation' },
      { status: 500 }
    )
  }
}

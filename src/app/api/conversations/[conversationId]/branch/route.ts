import { NextRequest, NextResponse } from 'next/server'
import { branchConversation } from '@/lib/db/services/conversation'

interface RouteParams {
  params: Promise<{
    conversationId: string
  }>
}

// POST /api/conversations/[conversationId]/branch - Create a branch from a conversation
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { conversationId } = await params
    const body = await request.json()
    const { branchPointMessageId, title, userId } = body

    if (!branchPointMessageId) {
      return NextResponse.json(
        { error: 'branchPointMessageId is required' },
        { status: 400 }
      )
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    const branchedConversation = await branchConversation({
      userId,
      sourceConversationId: conversationId,
      branchPointMessageId,
      title,
    })

    return NextResponse.json({ data: branchedConversation }, { status: 201 })
  } catch (error) {
    console.error('Error branching conversation:', error)
    const message = error instanceof Error ? error.message : 'Failed to branch conversation'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import {
  getConversation,
  getConversationWithMessages,
  getConversationWithBranches,
  updateConversation,
  deleteConversation,
  archiveConversation,
  toggleConversationPin,
} from '@/lib/db/services/conversation'

type RouteContext = { params: Promise<{ conversationId: string }> }

// GET /api/conversations/[conversationId] - Get a single conversation
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { conversationId } = await context.params
    const { searchParams } = new URL(request.url)
    const includeMessages = searchParams.get('messages') === 'true'
    const includeBranches = searchParams.get('branches') === 'true'

    let conversation
    if (includeBranches) {
      conversation = await getConversationWithBranches(conversationId)
    } else if (includeMessages) {
      conversation = await getConversationWithMessages(conversationId)
    } else {
      conversation = await getConversation(conversationId)
    }

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: conversation })
  } catch (error) {
    console.error('Error fetching conversation:', error)
    return NextResponse.json(
      { error: 'Failed to fetch conversation' },
      { status: 500 }
    )
  }
}

// PATCH /api/conversations/[conversationId] - Update a conversation
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { conversationId } = await context.params
    const body = await request.json()

    // Handle archive operation
    if (body.archive !== undefined) {
      const conversation = await archiveConversation(conversationId)
      return NextResponse.json({ data: conversation })
    }

    // Handle pin toggle operation
    if (body.togglePin === true) {
      const conversation = await toggleConversationPin(conversationId)
      return NextResponse.json({ data: conversation })
    }

    const { title, model, provider, systemPrompt, archived, pinned, projectId, folderId, metadata } = body

    const conversation = await updateConversation(conversationId, {
      title,
      model,
      provider,
      systemPrompt,
      archived,
      pinned,
      projectId,
      folderId,
      metadata,
    })

    return NextResponse.json({ data: conversation })
  } catch (error) {
    console.error('Error updating conversation:', error)
    return NextResponse.json(
      { error: 'Failed to update conversation' },
      { status: 500 }
    )
  }
}

// DELETE /api/conversations/[conversationId] - Delete a conversation
export async function DELETE(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { conversationId } = await context.params

    await deleteConversation(conversationId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting conversation:', error)
    return NextResponse.json(
      { error: 'Failed to delete conversation' },
      { status: 500 }
    )
  }
}

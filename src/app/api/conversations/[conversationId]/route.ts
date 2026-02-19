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
import { validateWorkspaceAccess } from '@/lib/auth/workspace'
import { requireSession, unauthorizedResponse, forbiddenResponse } from '@/lib/auth/session'

type RouteContext = { params: Promise<{ conversationId: string }> }

/**
 * Verify the session user owns or has workspace access to a conversation.
 */
async function authorizeConversation(conversation: { userId: string; workspaceId: string | null }, sessionUserId: string) {
  if (conversation.userId === sessionUserId) return true
  if (conversation.workspaceId) {
    return validateWorkspaceAccess(conversation.workspaceId, sessionUserId)
  }
  return false
}

// GET /api/conversations/[conversationId] - Get a single conversation
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await requireSession()
    if (!session) return unauthorizedResponse()

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

    if (!(await authorizeConversation(conversation, session.user.id))) {
      return forbiddenResponse()
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
    const session = await requireSession()
    if (!session) return unauthorizedResponse()

    const { conversationId } = await context.params
    const body = await request.json()

    // Get the current conversation to check ownership
    const existingConversation = await getConversation(conversationId)
    if (!existingConversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    if (!(await authorizeConversation(existingConversation, session.user.id))) {
      return forbiddenResponse()
    }

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

    const { title, model, provider, systemPrompt, archived, pinned, projectId, folderId, workspaceId, metadata } = body

    // If changing workspace, validate access to new workspace
    if (workspaceId !== undefined && workspaceId !== existingConversation.workspaceId) {
      if (workspaceId) {
        const hasAccessToNewWorkspace = await validateWorkspaceAccess(workspaceId, session.user.id)
        if (!hasAccessToNewWorkspace) {
          return NextResponse.json(
            { error: 'Access denied to the target workspace' },
            { status: 403 }
          )
        }
      }
    }

    const conversation = await updateConversation(conversationId, {
      title,
      model,
      provider,
      systemPrompt,
      archived,
      pinned,
      projectId,
      folderId,
      workspaceId,
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
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await requireSession()
    if (!session) return unauthorizedResponse()

    const { conversationId } = await context.params

    // Get the current conversation to check ownership
    const existingConversation = await getConversation(conversationId)
    if (!existingConversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    if (!(await authorizeConversation(existingConversation, session.user.id))) {
      return forbiddenResponse()
    }

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

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
    const userId = searchParams.get('userId')

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

    // Validate workspace access if user is provided and conversation belongs to a workspace
    if (userId && conversation.workspaceId) {
      const hasAccess = await validateWorkspaceAccess(conversation.workspaceId, userId)
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Access denied to this conversation' },
          { status: 403 }
        )
      }
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
    const { userId } = body

    // Get the current conversation to check workspace access
    const existingConversation = await getConversation(conversationId)
    if (!existingConversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // Validate workspace access if user is provided
    if (userId && existingConversation.workspaceId) {
      const hasAccess = await validateWorkspaceAccess(existingConversation.workspaceId, userId)
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Access denied to this conversation' },
          { status: 403 }
        )
      }
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
      if (workspaceId && userId) {
        const hasAccessToNewWorkspace = await validateWorkspaceAccess(workspaceId, userId)
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
    const { conversationId } = await context.params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    // Get the current conversation to check workspace access
    const existingConversation = await getConversation(conversationId)
    if (!existingConversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // Validate workspace access if user is provided
    if (userId && existingConversation.workspaceId) {
      const hasAccess = await validateWorkspaceAccess(existingConversation.workspaceId, userId)
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Access denied to this conversation' },
          { status: 403 }
        )
      }
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

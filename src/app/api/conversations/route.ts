import { NextRequest, NextResponse } from 'next/server'
import {
  createConversation,
  getUserConversations,
  getPinnedConversations,
  getRecentConversations,
  searchConversations,
} from '@/lib/db/services/conversation'
import { validateWorkspaceAccess } from '@/lib/auth/workspace'

// GET /api/conversations - Get conversations for user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const projectId = searchParams.get('projectId')
    const folderId = searchParams.get('folderId')
    const search = searchParams.get('search')
    const pinned = searchParams.get('pinned') === 'true'
    const recent = searchParams.get('recent') === 'true'
    const archived = searchParams.get('archived') === 'true'
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')
    // workspaceId: 'null' string means Personal space, actual value means workspace
    const workspaceIdParam = searchParams.get('workspaceId')
    const workspaceId = workspaceIdParam === 'null' ? null : workspaceIdParam

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    // Validate workspace access if a workspace is specified
    if (workspaceId) {
      const hasAccess = await validateWorkspaceAccess(workspaceId, userId)
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Access denied to this workspace' },
          { status: 403 }
        )
      }
    }

    // Search mode
    if (search) {
      const conversations = await searchConversations(userId, workspaceId, search, {
        projectId: projectId || undefined,
        folderId: folderId || undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
        includeArchived: archived,
      })
      return NextResponse.json({ data: conversations })
    }

    // Pinned conversations
    if (pinned) {
      const conversations = await getPinnedConversations(userId, workspaceId, {
        projectId: projectId || undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      })
      return NextResponse.json({ data: conversations })
    }

    // Recent conversations (without project)
    if (recent) {
      const conversations = await getRecentConversations(userId, workspaceId, {
        limit: limit ? parseInt(limit, 10) : undefined,
        excludeProjected: true,
      })
      return NextResponse.json({ data: conversations })
    }

    // User conversations
    const conversations = await getUserConversations(userId, workspaceId, {
      projectId: projectId || undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
      archived,
    })
    return NextResponse.json({ data: conversations })
  } catch (error) {
    console.error('Error fetching conversations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    )
  }
}

// POST /api/conversations - Create a new conversation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, projectId, folderId, workspaceId, title, model, provider, systemPrompt, metadata } = body

    if (!userId || !title || !model || !provider) {
      return NextResponse.json(
        { error: 'userId, title, model, and provider are required' },
        { status: 400 }
      )
    }

    // Validate workspace access if a workspace is specified
    if (workspaceId) {
      const hasAccess = await validateWorkspaceAccess(workspaceId, userId)
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Access denied to this workspace' },
          { status: 403 }
        )
      }
    }

    const conversation = await createConversation({
      userId,
      projectId,
      folderId,
      workspaceId: workspaceId ?? null, // null = Personal space
      title,
      model,
      provider,
      systemPrompt,
      metadata,
    })

    return NextResponse.json({ data: conversation }, { status: 201 })
  } catch (error) {
    console.error('Error creating conversation:', error)
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    )
  }
}

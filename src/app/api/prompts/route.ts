import { NextRequest, NextResponse } from 'next/server'
import {
  createPrompt,
  getUserPrompts,
  getWorkspacePrompts,
  searchPrompts,
  getPromptCategories,
} from '@/lib/db/services/prompt'
import { validateWorkspaceAccess } from '@/lib/auth/workspace'
import { requireSession, unauthorizedResponse } from '@/lib/auth/session'

// GET /api/prompts - Get prompts
export async function GET(request: NextRequest) {
  try {
    const session = await requireSession()
    if (!session) return unauthorizedResponse()
    const userId = session.user.id

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const categories = searchParams.get('categories') === 'true'
    const includePublic = searchParams.get('includePublic') === 'true'
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')

    // Validate workspace access if specified
    if (workspaceId) {
      const hasAccess = await validateWorkspaceAccess(workspaceId, userId)
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Access denied to this workspace' },
          { status: 403 }
        )
      }
    }

    // Get categories only
    if (categories) {
      const cats = await getPromptCategories(workspaceId || undefined)
      return NextResponse.json({ data: cats })
    }

    // Search mode
    if (search) {
      const prompts = await searchPrompts(search, {
        userId,
        workspaceId: workspaceId || undefined,
        category: category || undefined,
        includePublic,
        limit: limit ? parseInt(limit, 10) : undefined,
      })
      return NextResponse.json({ data: prompts })
    }

    // Workspace prompts
    if (workspaceId) {
      const prompts = await getWorkspacePrompts(workspaceId, {
        category: category || undefined,
        includePublic,
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
      })
      return NextResponse.json({ data: prompts })
    }

    // User prompts
    const prompts = await getUserPrompts(userId, {
      category: category || undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    })
    return NextResponse.json({ data: prompts })
  } catch (error) {
    console.error('Error fetching prompts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch prompts' },
      { status: 500 }
    )
  }
}

// POST /api/prompts - Create a new prompt
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession()
    if (!session) return unauthorizedResponse()
    const userId = session.user.id

    const body = await request.json()
    const {
      workspaceId,
      projectId,
      name,
      description,
      content,
      variables,
      category,
      tags,
      isPublic,
    } = body

    if (!name || !content) {
      return NextResponse.json(
        { error: 'name and content are required' },
        { status: 400 }
      )
    }

    // Validate workspace access if specified
    if (workspaceId) {
      const hasAccess = await validateWorkspaceAccess(workspaceId, userId)
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Access denied to this workspace' },
          { status: 403 }
        )
      }
    }

    const prompt = await createPrompt({
      userId,
      workspaceId,
      projectId,
      name,
      description,
      content,
      variables,
      category,
      tags,
      isPublic,
    })

    return NextResponse.json({ data: prompt }, { status: 201 })
  } catch (error) {
    console.error('Error creating prompt:', error)
    return NextResponse.json(
      { error: 'Failed to create prompt' },
      { status: 500 }
    )
  }
}

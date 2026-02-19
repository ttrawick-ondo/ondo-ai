import { NextRequest, NextResponse } from 'next/server'
import {
  createProject,
  getUserProjects,
  searchProjects,
} from '@/lib/db/services/project'
import { validateWorkspaceAccess } from '@/lib/auth/workspace'
import { requireSession, unauthorizedResponse } from '@/lib/auth/session'

// GET /api/projects - Get projects for user or workspace
export async function GET(request: NextRequest) {
  try {
    const session = await requireSession()
    if (!session) return unauthorizedResponse()
    const userId = session.user.id

    const { searchParams } = new URL(request.url)
    const workspaceIdParam = searchParams.get('workspaceId')
    // 'null' string = Personal space, actual value = workspace, not provided = all
    const workspaceId = workspaceIdParam === 'null' ? null : workspaceIdParam
    const search = searchParams.get('search')
    const archived = searchParams.get('archived') === 'true'
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

    // Search mode
    if (search) {
      const projects = await searchProjects(userId, search, {
        workspaceId: workspaceId ?? undefined,
        includeArchived: archived,
        limit: limit ? parseInt(limit, 10) : undefined,
      })
      return NextResponse.json({ data: projects })
    }

    // Filter by workspace if provided (including null for Personal)
    const projects = await getUserProjects(userId, {
      workspaceId: workspaceIdParam !== null ? workspaceId : undefined,
      archived,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    })
    return NextResponse.json({ data: projects })
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}

// POST /api/projects - Create a new project
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession()
    if (!session) return unauthorizedResponse()
    const userId = session.user.id

    const body = await request.json()
    const { workspaceId, name, description, color, icon, settings } = body

    if (!name) {
      return NextResponse.json(
        { error: 'name is required' },
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

    const project = await createProject({
      workspaceId: workspaceId ?? null, // null = Personal space
      ownerId: userId,
      name,
      description,
      color,
      icon,
      settings,
    })

    return NextResponse.json({ data: project }, { status: 201 })
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    )
  }
}

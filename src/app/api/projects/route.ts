import { NextRequest, NextResponse } from 'next/server'
import {
  createProject,
  getUserProjects,
  getWorkspaceProjects,
  searchProjects,
} from '@/lib/db/services/project'

// GET /api/projects - Get projects for user or workspace
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const workspaceId = searchParams.get('workspaceId')
    const search = searchParams.get('search')
    const archived = searchParams.get('archived') === 'true'
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')

    // Search mode
    if (search && userId) {
      const projects = await searchProjects(userId, search, {
        workspaceId: workspaceId || undefined,
        includeArchived: archived,
        limit: limit ? parseInt(limit, 10) : undefined,
      })
      return NextResponse.json({ data: projects })
    }

    // Workspace projects
    if (workspaceId) {
      const projects = await getWorkspaceProjects(workspaceId, {
        archived,
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
      })
      return NextResponse.json({ data: projects })
    }

    // User projects (requires userId)
    if (!userId) {
      return NextResponse.json(
        { error: 'userId or workspaceId is required' },
        { status: 400 }
      )
    }

    const projects = await getUserProjects(userId, {
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
    const body = await request.json()
    const { workspaceId, ownerId, name, description, color, icon, settings } = body

    if (!workspaceId || !ownerId || !name) {
      return NextResponse.json(
        { error: 'workspaceId, ownerId, and name are required' },
        { status: 400 }
      )
    }

    const project = await createProject({
      workspaceId,
      ownerId,
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

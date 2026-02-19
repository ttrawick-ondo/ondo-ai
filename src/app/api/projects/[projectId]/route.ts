import { NextRequest, NextResponse } from 'next/server'
import {
  getProject,
  getProjectWithStats,
  getProjectWithRelations,
  updateProject,
  deleteProject,
  archiveProject,
  unarchiveProject,
} from '@/lib/db/services/project'
import { validateWorkspaceAccess } from '@/lib/auth/workspace'
import { requireSession, unauthorizedResponse, forbiddenResponse } from '@/lib/auth/session'

type RouteContext = { params: Promise<{ projectId: string }> }

/**
 * Verify the session user owns or has workspace access to a project.
 */
async function authorizeProject(project: { ownerId: string; workspaceId: string | null }, sessionUserId: string) {
  if (project.ownerId === sessionUserId) return true
  if (project.workspaceId) {
    return validateWorkspaceAccess(project.workspaceId, sessionUserId)
  }
  return false
}

// GET /api/projects/[projectId] - Get a single project
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await requireSession()
    if (!session) return unauthorizedResponse()

    const { projectId } = await context.params
    const { searchParams } = new URL(request.url)
    const includeRelations = searchParams.get('relations') === 'true'
    const includeStats = searchParams.get('stats') === 'true'

    let project
    if (includeRelations) {
      project = await getProjectWithRelations(projectId)
    } else if (includeStats) {
      project = await getProjectWithStats(projectId)
    } else {
      project = await getProject(projectId)
    }

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    if (!(await authorizeProject(project, session.user.id))) {
      return forbiddenResponse()
    }

    return NextResponse.json({ data: project })
  } catch (error) {
    console.error('Error fetching project:', error)
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    )
  }
}

// PATCH /api/projects/[projectId] - Update a project
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await requireSession()
    if (!session) return unauthorizedResponse()

    const { projectId } = await context.params

    const existingProject = await getProject(projectId)
    if (!existingProject) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    if (!(await authorizeProject(existingProject, session.user.id))) {
      return forbiddenResponse()
    }

    const body = await request.json()

    // Check if this is an archive/unarchive operation
    if (body.archive !== undefined) {
      const project = body.archive
        ? await archiveProject(projectId)
        : await unarchiveProject(projectId)
      return NextResponse.json({ data: project })
    }

    const { name, description, color, icon, archived, settings } = body

    const project = await updateProject(projectId, {
      name,
      description,
      color,
      icon,
      archived,
      settings,
    })

    return NextResponse.json({ data: project })
  } catch (error) {
    console.error('Error updating project:', error)
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    )
  }
}

// DELETE /api/projects/[projectId] - Delete a project
export async function DELETE(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await requireSession()
    if (!session) return unauthorizedResponse()

    const { projectId } = await context.params

    const existingProject = await getProject(projectId)
    if (!existingProject) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    if (!(await authorizeProject(existingProject, session.user.id))) {
      return forbiddenResponse()
    }

    await deleteProject(projectId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting project:', error)
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    )
  }
}

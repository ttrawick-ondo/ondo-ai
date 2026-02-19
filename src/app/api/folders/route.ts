import { NextRequest, NextResponse } from 'next/server'
import {
  createFolder,
  getProjectFolders,
  getFolderTree,
} from '@/lib/db/services/folder'
import { getProject } from '@/lib/db/services/project'
import { validateWorkspaceAccess } from '@/lib/auth/workspace'
import { requireSession, unauthorizedResponse, forbiddenResponse } from '@/lib/auth/session'

/**
 * Verify session user owns or has workspace access to a project.
 */
async function authorizeProjectAccess(projectId: string, sessionUserId: string) {
  const project = await getProject(projectId)
  if (!project) return { authorized: false, notFound: true } as const
  if (project.ownerId === sessionUserId) return { authorized: true } as const
  if (project.workspaceId) {
    const hasAccess = await validateWorkspaceAccess(project.workspaceId, sessionUserId)
    if (hasAccess) return { authorized: true } as const
  }
  return { authorized: false, notFound: false } as const
}

// GET /api/folders?projectId=xxx - Get folders for a project
export async function GET(request: NextRequest) {
  try {
    const session = await requireSession()
    if (!session) return unauthorizedResponse()

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const tree = searchParams.get('tree') === 'true'

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      )
    }

    const authResult = await authorizeProjectAccess(projectId, session.user.id)
    if (!authResult.authorized) {
      if ('notFound' in authResult && authResult.notFound) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 })
      }
      return forbiddenResponse()
    }

    if (tree) {
      const folderTree = await getFolderTree(projectId)
      return NextResponse.json({ data: folderTree })
    }

    const folders = await getProjectFolders(projectId)
    return NextResponse.json({ data: folders })
  } catch (error) {
    console.error('Error fetching folders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch folders' },
      { status: 500 }
    )
  }
}

// POST /api/folders - Create a new folder
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession()
    if (!session) return unauthorizedResponse()

    const body = await request.json()
    const { projectId, parentId, name, color, icon, position } = body

    if (!projectId || !name) {
      return NextResponse.json(
        { error: 'projectId and name are required' },
        { status: 400 }
      )
    }

    const authResult = await authorizeProjectAccess(projectId, session.user.id)
    if (!authResult.authorized) {
      if ('notFound' in authResult && authResult.notFound) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 })
      }
      return forbiddenResponse()
    }

    const folder = await createFolder({
      projectId,
      parentId: parentId || null,
      name,
      color,
      icon,
      position,
    })

    return NextResponse.json({ data: folder }, { status: 201 })
  } catch (error) {
    console.error('Error creating folder:', error)
    return NextResponse.json(
      { error: 'Failed to create folder' },
      { status: 500 }
    )
  }
}

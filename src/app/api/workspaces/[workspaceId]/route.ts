import { NextRequest, NextResponse } from 'next/server'
import {
  getWorkspace,
  getWorkspaceWithMembers,
  updateWorkspace,
  deleteWorkspace,
} from '@/lib/db/services/workspace'
import { validateWorkspaceAccess } from '@/lib/auth/workspace'
import { requireSession, unauthorizedResponse, forbiddenResponse } from '@/lib/auth/session'

interface RouteParams {
  params: Promise<{ workspaceId: string }>
}

// GET /api/workspaces/:workspaceId - Get a workspace
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession()
    if (!session) return unauthorizedResponse()

    const { workspaceId } = await params
    const { searchParams } = new URL(request.url)
    const includeMembers = searchParams.get('members') === 'true'

    // Verify the user is a member of this workspace
    const hasAccess = await validateWorkspaceAccess(workspaceId, session.user.id)
    if (!hasAccess) return forbiddenResponse()

    const workspace = includeMembers
      ? await getWorkspaceWithMembers(workspaceId)
      : await getWorkspace(workspaceId)

    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: workspace })
  } catch (error) {
    console.error('Error fetching workspace:', error)
    return NextResponse.json(
      { error: 'Failed to fetch workspace' },
      { status: 500 }
    )
  }
}

// PATCH /api/workspaces/:workspaceId - Update a workspace
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession()
    if (!session) return unauthorizedResponse()

    const { workspaceId } = await params

    const hasAccess = await validateWorkspaceAccess(workspaceId, session.user.id)
    if (!hasAccess) return forbiddenResponse()

    const body = await request.json()
    const { name, description, settings } = body

    const workspace = await updateWorkspace(workspaceId, {
      name,
      description,
      settings,
    })

    return NextResponse.json({ data: workspace })
  } catch (error) {
    console.error('Error updating workspace:', error)
    return NextResponse.json(
      { error: 'Failed to update workspace' },
      { status: 500 }
    )
  }
}

// DELETE /api/workspaces/:workspaceId - Delete a workspace
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession()
    if (!session) return unauthorizedResponse()

    const { workspaceId } = await params

    const hasAccess = await validateWorkspaceAccess(workspaceId, session.user.id)
    if (!hasAccess) return forbiddenResponse()

    await deleteWorkspace(workspaceId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting workspace:', error)
    return NextResponse.json(
      { error: 'Failed to delete workspace' },
      { status: 500 }
    )
  }
}

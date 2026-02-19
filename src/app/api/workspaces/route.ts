import { NextRequest, NextResponse } from 'next/server'
import {
  createWorkspace,
  getUserWorkspaces,
  getUserWorkspacesWithRole,
} from '@/lib/db/services/workspace'
import { requireSession, unauthorizedResponse } from '@/lib/auth/session'

// GET /api/workspaces - Get workspaces for user
export async function GET(request: NextRequest) {
  try {
    const session = await requireSession()
    if (!session) return unauthorizedResponse()
    const userId = session.user.id

    const { searchParams } = new URL(request.url)
    const includeRole = searchParams.get('includeRole') === 'true'

    const workspaces = includeRole
      ? await getUserWorkspacesWithRole(userId)
      : await getUserWorkspaces(userId)

    return NextResponse.json({ data: workspaces })
  } catch (error) {
    console.error('Error fetching workspaces:', error)
    return NextResponse.json(
      { error: 'Failed to fetch workspaces' },
      { status: 500 }
    )
  }
}

// POST /api/workspaces - Create a new workspace
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession()
    if (!session) return unauthorizedResponse()
    const userId = session.user.id

    const body = await request.json()
    const { name, description, settings } = body

    if (!name) {
      return NextResponse.json(
        { error: 'name is required' },
        { status: 400 }
      )
    }

    const workspace = await createWorkspace({
      name,
      description,
      ownerId: userId,
      settings,
    })

    return NextResponse.json({ data: workspace }, { status: 201 })
  } catch (error) {
    console.error('Error creating workspace:', error)
    return NextResponse.json(
      { error: 'Failed to create workspace' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import {
  createWorkspace,
  getUserWorkspaces,
  getUserWorkspacesWithRole,
} from '@/lib/db/services/workspace'

// GET /api/workspaces - Get workspaces for user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const includeRole = searchParams.get('includeRole') === 'true'

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

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
    const body = await request.json()
    const { name, description, ownerId, settings } = body

    if (!name || !ownerId) {
      return NextResponse.json(
        { error: 'name and ownerId are required' },
        { status: 400 }
      )
    }

    const workspace = await createWorkspace({
      name,
      description,
      ownerId,
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

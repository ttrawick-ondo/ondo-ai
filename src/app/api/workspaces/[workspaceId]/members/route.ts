import { NextRequest, NextResponse } from 'next/server'
import {
  getWorkspaceMembers,
  getWorkspaceMember,
  addWorkspaceMember,
  updateMemberRole,
  removeWorkspaceMember,
} from '@/lib/db/services/workspace'

interface RouteParams {
  params: Promise<{ workspaceId: string }>
}

// GET /api/workspaces/:workspaceId/members - Get workspace members
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceId } = await params

    const members = await getWorkspaceMembers(workspaceId)

    return NextResponse.json({ data: members })
  } catch (error) {
    console.error('Error fetching members:', error)
    return NextResponse.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    )
  }
}

// POST /api/workspaces/:workspaceId/members - Add a member
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceId } = await params
    const body = await request.json()
    const { userId, role } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    // Check if user is already a member
    const existingMember = await getWorkspaceMember(workspaceId, userId)
    if (existingMember) {
      return NextResponse.json(
        { error: 'User is already a member of this workspace' },
        { status: 400 }
      )
    }

    const member = await addWorkspaceMember(workspaceId, userId, role || 'member')

    return NextResponse.json({ data: member }, { status: 201 })
  } catch (error) {
    console.error('Error adding member:', error)
    return NextResponse.json(
      { error: 'Failed to add member' },
      { status: 500 }
    )
  }
}

// PATCH /api/workspaces/:workspaceId/members - Update member role
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceId } = await params
    const body = await request.json()
    const { userId, role } = body

    if (!userId || !role) {
      return NextResponse.json(
        { error: 'userId and role are required' },
        { status: 400 }
      )
    }

    const member = await updateMemberRole(workspaceId, userId, role)

    return NextResponse.json({ data: member })
  } catch (error) {
    console.error('Error updating member:', error)
    return NextResponse.json(
      { error: 'Failed to update member' },
      { status: 500 }
    )
  }
}

// DELETE /api/workspaces/:workspaceId/members - Remove a member
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceId } = await params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    await removeWorkspaceMember(workspaceId, userId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing member:', error)
    const message = error instanceof Error ? error.message : 'Failed to remove member'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}

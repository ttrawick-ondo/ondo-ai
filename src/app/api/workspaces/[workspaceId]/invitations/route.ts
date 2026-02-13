import { NextRequest, NextResponse } from 'next/server'
import {
  getPendingInvitations,
  createWorkspaceInvitation,
  deleteWorkspaceInvitation,
  getWorkspaceMember,
} from '@/lib/db/services/workspace'
import { getUserByEmail } from '@/lib/db/services/user'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ workspaceId: string }>
}

// GET /api/workspaces/:workspaceId/invitations - List pending invitations
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceId } = await params

    const invitations = await getPendingInvitations(workspaceId)

    return NextResponse.json({ data: invitations })
  } catch (error) {
    console.error('Error fetching invitations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invitations' },
      { status: 500 }
    )
  }
}

// POST /api/workspaces/:workspaceId/invitations - Create invitation
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceId } = await params
    const body = await request.json()
    const { email, role = 'member' } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Validate role
    if (!['admin', 'member'].includes(role)) {
      return NextResponse.json(
        { error: 'Role must be "admin" or "member"' },
        { status: 400 }
      )
    }

    // Check if user already exists and is a member
    const existingUser = await getUserByEmail(email)
    if (existingUser) {
      const existingMember = await getWorkspaceMember(workspaceId, existingUser.id)
      if (existingMember) {
        return NextResponse.json(
          { error: 'User is already a member of this workspace' },
          { status: 400 }
        )
      }
    }

    const invitation = await createWorkspaceInvitation(workspaceId, email, role)

    return NextResponse.json({ data: invitation }, { status: 201 })
  } catch (error) {
    console.error('Error creating invitation:', error)
    return NextResponse.json(
      { error: 'Failed to create invitation' },
      { status: 500 }
    )
  }
}

// DELETE /api/workspaces/:workspaceId/invitations - Cancel invitation
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceId } = await params
    const { searchParams } = new URL(request.url)
    const invitationId = searchParams.get('id')

    if (!invitationId) {
      return NextResponse.json(
        { error: 'Invitation ID is required' },
        { status: 400 }
      )
    }

    await deleteWorkspaceInvitation(invitationId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting invitation:', error)
    return NextResponse.json(
      { error: 'Failed to delete invitation' },
      { status: 500 }
    )
  }
}

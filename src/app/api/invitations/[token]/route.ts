import { NextRequest, NextResponse } from 'next/server'
import {
  getWorkspaceInvitationByToken,
  acceptWorkspaceInvitation,
  getWorkspaceMember,
} from '@/lib/db/services/workspace'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ token: string }>
}

// GET /api/invitations/:token - Get invitation details
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params

    const invitation = await getWorkspaceInvitationByToken(token)

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      )
    }

    // Check if expired
    if (new Date() > invitation.expiresAt) {
      return NextResponse.json(
        { error: 'Invitation has expired', expired: true },
        { status: 410 }
      )
    }

    // Check if already accepted
    if (invitation.acceptedAt) {
      return NextResponse.json(
        { error: 'Invitation has already been used', used: true },
        { status: 410 }
      )
    }

    return NextResponse.json({
      data: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
        workspace: {
          id: invitation.workspace.id,
          name: invitation.workspace.name,
          slug: invitation.workspace.slug,
        },
      },
    })
  } catch (error) {
    console.error('Error fetching invitation:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invitation' },
      { status: 500 }
    )
  }
}

// POST /api/invitations/:token - Accept invitation
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    // Get invitation to check workspace
    const invitation = await getWorkspaceInvitationByToken(token)
    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      )
    }

    // Check if user is already a member
    const existingMember = await getWorkspaceMember(invitation.workspaceId, userId)
    if (existingMember) {
      return NextResponse.json(
        { error: 'You are already a member of this workspace' },
        { status: 400 }
      )
    }

    const member = await acceptWorkspaceInvitation(token, userId)

    return NextResponse.json({
      data: {
        member,
        workspace: {
          id: invitation.workspace.id,
          name: invitation.workspace.name,
          slug: invitation.workspace.slug,
        },
      },
    })
  } catch (error) {
    console.error('Error accepting invitation:', error)
    const message = error instanceof Error ? error.message : 'Failed to accept invitation'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}

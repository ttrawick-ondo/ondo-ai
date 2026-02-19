import { NextRequest, NextResponse } from 'next/server'
import {
  getPrompt,
  updatePrompt,
  deletePrompt,
  duplicatePrompt,
  incrementPromptUsage,
} from '@/lib/db/services/prompt'
import { validateWorkspaceAccess } from '@/lib/auth/workspace'
import { requireSession, unauthorizedResponse, forbiddenResponse } from '@/lib/auth/session'

interface RouteParams {
  params: Promise<{ promptId: string }>
}

/**
 * Verify the session user owns or has workspace access to a prompt.
 */
async function authorizePrompt(prompt: { userId: string; workspaceId: string | null; isPublic: boolean }, sessionUserId: string, requireOwnership = false) {
  if (prompt.userId === sessionUserId) return true
  if (requireOwnership) return false
  if (prompt.isPublic) return true
  if (prompt.workspaceId) {
    return validateWorkspaceAccess(prompt.workspaceId, sessionUserId)
  }
  return false
}

// GET /api/prompts/:promptId - Get a prompt
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession()
    if (!session) return unauthorizedResponse()

    const { promptId } = await params

    const prompt = await getPrompt(promptId)

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt not found' },
        { status: 404 }
      )
    }

    if (!(await authorizePrompt(prompt, session.user.id))) {
      return forbiddenResponse()
    }

    return NextResponse.json({ data: prompt })
  } catch (error) {
    console.error('Error fetching prompt:', error)
    return NextResponse.json(
      { error: 'Failed to fetch prompt' },
      { status: 500 }
    )
  }
}

// PATCH /api/prompts/:promptId - Update a prompt
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession()
    if (!session) return unauthorizedResponse()

    const { promptId } = await params

    const existingPrompt = await getPrompt(promptId)
    if (!existingPrompt) {
      return NextResponse.json(
        { error: 'Prompt not found' },
        { status: 404 }
      )
    }

    // Require ownership for mutations
    if (!(await authorizePrompt(existingPrompt, session.user.id, true))) {
      return forbiddenResponse()
    }

    const body = await request.json()

    // Handle special actions
    if (body.incrementUsage) {
      const prompt = await incrementPromptUsage(promptId)
      return NextResponse.json({ data: prompt })
    }

    const { name, description, content, variables, category, tags, isPublic } = body

    const prompt = await updatePrompt(promptId, {
      name,
      description,
      content,
      variables,
      category,
      tags,
      isPublic,
    })

    return NextResponse.json({ data: prompt })
  } catch (error) {
    console.error('Error updating prompt:', error)
    return NextResponse.json(
      { error: 'Failed to update prompt' },
      { status: 500 }
    )
  }
}

// DELETE /api/prompts/:promptId - Delete a prompt
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession()
    if (!session) return unauthorizedResponse()

    const { promptId } = await params

    const existingPrompt = await getPrompt(promptId)
    if (!existingPrompt) {
      return NextResponse.json(
        { error: 'Prompt not found' },
        { status: 404 }
      )
    }

    if (!(await authorizePrompt(existingPrompt, session.user.id, true))) {
      return forbiddenResponse()
    }

    await deletePrompt(promptId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting prompt:', error)
    return NextResponse.json(
      { error: 'Failed to delete prompt' },
      { status: 500 }
    )
  }
}

// POST /api/prompts/:promptId - Duplicate a prompt
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession()
    if (!session) return unauthorizedResponse()

    const { promptId } = await params

    const prompt = await duplicatePrompt(promptId, session.user.id)

    return NextResponse.json({ data: prompt }, { status: 201 })
  } catch (error) {
    console.error('Error duplicating prompt:', error)
    return NextResponse.json(
      { error: 'Failed to duplicate prompt' },
      { status: 500 }
    )
  }
}

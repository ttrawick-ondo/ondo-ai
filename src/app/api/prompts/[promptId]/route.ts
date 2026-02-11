import { NextRequest, NextResponse } from 'next/server'
import {
  getPrompt,
  updatePrompt,
  deletePrompt,
  duplicatePrompt,
  incrementPromptUsage,
} from '@/lib/db/services/prompt'

interface RouteParams {
  params: Promise<{ promptId: string }>
}

// GET /api/prompts/:promptId - Get a prompt
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { promptId } = await params

    const prompt = await getPrompt(promptId)

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt not found' },
        { status: 404 }
      )
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
    const { promptId } = await params
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
    const { promptId } = await params

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
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { promptId } = await params
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    const prompt = await duplicatePrompt(promptId, userId)

    return NextResponse.json({ data: prompt }, { status: 201 })
  } catch (error) {
    console.error('Error duplicating prompt:', error)
    return NextResponse.json(
      { error: 'Failed to duplicate prompt' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import type { CreateGleanAgentInput } from '@/types'
import { GleanProvider } from '@/lib/api/providers'
import { APIError, ValidationError } from '@/lib/api/errors/apiErrors'

const gleanProvider = new GleanProvider()

// GET /api/glean/agents - List agents for a workspace
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')

    if (!workspaceId) {
      throw new ValidationError('workspaceId is required')
    }

    if (!gleanProvider.isConfigured()) {
      return NextResponse.json(
        {
          code: 'PROVIDER_NOT_CONFIGURED',
          message: 'Glean provider is not configured',
        },
        { status: 503 }
      )
    }

    const agents = await gleanProvider.listAgents(workspaceId)

    return NextResponse.json({ agents })
  } catch (error) {
    if (error instanceof APIError) {
      return NextResponse.json(error.toJSON(), { status: error.statusCode })
    }

    console.error('Glean agents API error:', error)

    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to list agents',
      },
      { status: 500 }
    )
  }
}

// POST /api/glean/agents - Create a new agent
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId') || body.workspaceId

    if (!workspaceId) {
      throw new ValidationError('workspaceId is required')
    }

    if (!body.name || typeof body.name !== 'string') {
      throw new ValidationError('name is required and must be a string')
    }

    if (!body.systemPrompt || typeof body.systemPrompt !== 'string') {
      throw new ValidationError('systemPrompt is required and must be a string')
    }

    if (!gleanProvider.isConfigured()) {
      return NextResponse.json(
        {
          code: 'PROVIDER_NOT_CONFIGURED',
          message: 'Glean provider is not configured',
        },
        { status: 503 }
      )
    }

    const input: CreateGleanAgentInput = {
      name: body.name,
      description: body.description,
      systemPrompt: body.systemPrompt,
      dataSourceIds: body.dataSourceIds || [],
      temperature: body.temperature,
    }

    const agent = await gleanProvider.createAgent(workspaceId, input)

    return NextResponse.json({ agent }, { status: 201 })
  } catch (error) {
    if (error instanceof APIError) {
      return NextResponse.json(error.toJSON(), { status: error.statusCode })
    }

    console.error('Glean agents API error:', error)

    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create agent',
      },
      { status: 500 }
    )
  }
}

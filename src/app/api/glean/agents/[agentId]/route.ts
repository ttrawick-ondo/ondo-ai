import { NextRequest, NextResponse } from 'next/server'
import type { UpdateGleanAgentInput } from '@/types'
import { GleanProvider } from '@/lib/api/providers'
import { APIError } from '@/lib/api/errors/apiErrors'

const gleanProvider = new GleanProvider()

interface RouteParams {
  params: Promise<{
    agentId: string
  }>
}

// GET /api/glean/agents/[agentId] - Get a specific agent
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { agentId } = await params

    if (!gleanProvider.isConfigured()) {
      return NextResponse.json(
        {
          code: 'PROVIDER_NOT_CONFIGURED',
          message: 'Glean provider is not configured',
        },
        { status: 503 }
      )
    }

    const agent = await gleanProvider.getAgent(agentId)

    return NextResponse.json({ agent })
  } catch (error) {
    if (error instanceof APIError) {
      return NextResponse.json(error.toJSON(), { status: error.statusCode })
    }

    console.error('Glean agent API error:', error)

    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get agent',
      },
      { status: 500 }
    )
  }
}

// PUT /api/glean/agents/[agentId] - Update an agent
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { agentId } = await params
    const body = await request.json()

    if (!gleanProvider.isConfigured()) {
      return NextResponse.json(
        {
          code: 'PROVIDER_NOT_CONFIGURED',
          message: 'Glean provider is not configured',
        },
        { status: 503 }
      )
    }

    const input: UpdateGleanAgentInput = {
      name: body.name,
      description: body.description,
      systemPrompt: body.systemPrompt,
      dataSourceIds: body.dataSourceIds,
      temperature: body.temperature,
    }

    const agent = await gleanProvider.updateAgent(agentId, input)

    return NextResponse.json({ agent })
  } catch (error) {
    if (error instanceof APIError) {
      return NextResponse.json(error.toJSON(), { status: error.statusCode })
    }

    console.error('Glean agent API error:', error)

    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update agent',
      },
      { status: 500 }
    )
  }
}

// DELETE /api/glean/agents/[agentId] - Delete an agent
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { agentId } = await params

    if (!gleanProvider.isConfigured()) {
      return NextResponse.json(
        {
          code: 'PROVIDER_NOT_CONFIGURED',
          message: 'Glean provider is not configured',
        },
        { status: 503 }
      )
    }

    await gleanProvider.deleteAgent(agentId)

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    if (error instanceof APIError) {
      return NextResponse.json(error.toJSON(), { status: error.statusCode })
    }

    console.error('Glean agent API error:', error)

    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to delete agent',
      },
      { status: 500 }
    )
  }
}

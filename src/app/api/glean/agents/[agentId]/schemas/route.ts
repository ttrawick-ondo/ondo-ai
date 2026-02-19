import { NextRequest, NextResponse } from 'next/server'
import { getProvider, GleanProvider } from '@/lib/api/providers'
import { requireSession, unauthorizedResponse } from '@/lib/auth/session'

interface RouteParams {
  params: Promise<{
    agentId: string
  }>
}

/**
 * GET /api/glean/agents/[agentId]/schemas - Get agent input/output schemas
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession()
    if (!session) return unauthorizedResponse()

    const { agentId } = await params

    const gleanProvider = getProvider('glean') as GleanProvider

    if (!gleanProvider.isConfigured()) {
      return NextResponse.json(
        {
          code: 'PROVIDER_NOT_CONFIGURED',
          message: 'Glean provider is not configured. Set GLEAN_API_KEY environment variable.',
        },
        { status: 503 }
      )
    }

    const schemas = await gleanProvider.getAgentSchemas(agentId)

    return NextResponse.json(schemas)
  } catch (error) {
    console.error('Glean agent schemas error:', error)

    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get agent schemas',
      },
      { status: 500 }
    )
  }
}

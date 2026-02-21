import { NextRequest, NextResponse } from 'next/server'
import { getProvider, GleanProvider } from '@/lib/api/providers'
import { requireSession, unauthorizedResponse } from '@/lib/auth/session'

interface RouteParams {
  params: Promise<{
    agentId: string
  }>
}

/**
 * GET /api/glean/agents/[agentId] - Get agent metadata (read-only)
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

    const agent = await gleanProvider.getAgent(agentId, session.user.email || undefined)

    return NextResponse.json({ agent })
  } catch (error) {
    console.error('Glean agent API error:', error)

    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get agent',
      },
      { status: 500 }
    )
  }
}

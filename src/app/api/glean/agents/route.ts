import { NextRequest, NextResponse } from 'next/server'
import { getProvider, GleanProvider } from '@/lib/api/providers'

/**
 * GET /api/glean/agents - Search/list agents
 *
 * Query params:
 * - query: Optional search query
 * - pageSize: Number of results (default: 20)
 * - cursor: Pagination cursor
 *
 * NOTE: Agent creation is NOT supported via API.
 * Agents must be created via the Glean Agent Builder UI.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query') || undefined
    const pageSize = searchParams.get('pageSize')
      ? parseInt(searchParams.get('pageSize')!, 10)
      : 20
    const cursor = searchParams.get('cursor') || undefined

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

    const result = await gleanProvider.searchAgents({ query, pageSize, cursor })

    return NextResponse.json({
      agents: result.agents,
      cursor: result.cursor,
      hasMoreResults: result.hasMoreResults,
    })
  } catch (error) {
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

/**
 * POST /api/glean/agents - Agent creation is NOT supported
 *
 * Returns 501 Not Implemented with instructions to use Glean Agent Builder UI.
 */
export async function POST() {
  return NextResponse.json(
    {
      code: 'NOT_IMPLEMENTED',
      message:
        'Agent creation via API is not supported by Glean. ' +
        'Please use the Glean Agent Builder UI to create agents: ' +
        'https://app.glean.com/admin/platform/agents',
    },
    { status: 501 }
  )
}

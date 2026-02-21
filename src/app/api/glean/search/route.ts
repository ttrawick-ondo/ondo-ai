import { NextRequest, NextResponse } from 'next/server'
import { getGleanSearchService } from '@/lib/api/glean'
import { requireSession, unauthorizedResponse } from '@/lib/auth/session'

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession()
    if (!session) return unauthorizedResponse()

    const body = await request.json()

    if (!body.query || body.query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      )
    }

    const searchService = getGleanSearchService()
    const result = await searchService.searchWithCitations(body.query, {
      datasource: body.datasource,
      maxResults: body.maxResults || 10,
      userEmail: session.user.email || undefined,
    })

    return NextResponse.json({
      success: true,
      citations: result.citations,
      totalCount: result.totalCount,
    })
  } catch (error) {
    console.error('Glean search error:', error)
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const session = await requireSession()
    if (!session) return unauthorizedResponse()

    const searchService = getGleanSearchService()
    const dataSources = await searchService.listDataSources(session.user.email || undefined)

    return NextResponse.json({
      success: true,
      dataSources,
    })
  } catch (error) {
    console.error('Failed to list data sources:', error)
    return NextResponse.json(
      { error: 'Failed to list data sources' },
      { status: 500 }
    )
  }
}

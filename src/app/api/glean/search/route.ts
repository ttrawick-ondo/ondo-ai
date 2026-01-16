import { NextRequest, NextResponse } from 'next/server'
import { getGleanSearchService } from '@/lib/api/glean'

export async function POST(request: NextRequest) {
  try {
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
    })

    return NextResponse.json({
      success: true,
      citations: result.citations,
      totalCount: result.totalCount,
    })
  } catch (error) {
    console.error('Glean search error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Search failed' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const searchService = getGleanSearchService()
    const dataSources = await searchService.listDataSources()

    return NextResponse.json({
      success: true,
      dataSources,
    })
  } catch (error) {
    console.error('Failed to list data sources:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list data sources' },
      { status: 500 }
    )
  }
}

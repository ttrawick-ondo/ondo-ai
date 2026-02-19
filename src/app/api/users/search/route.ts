import { NextRequest, NextResponse } from 'next/server'
import { searchUsers } from '@/lib/db/services/user'
import { requireSession, unauthorizedResponse } from '@/lib/auth/session'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// GET /api/users/search?q=email&excludeWorkspace=id
export async function GET(request: NextRequest) {
  try {
    const session = await requireSession()
    if (!session) return unauthorizedResponse()

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const excludeWorkspaceId = searchParams.get('excludeWorkspace')
    const limitParam = searchParams.get('limit')

    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: 'Search query must be at least 2 characters' },
        { status: 400 }
      )
    }

    const limit = limitParam ? parseInt(limitParam, 10) : 10

    const users = await searchUsers(query, {
      excludeWorkspaceId: excludeWorkspaceId ?? undefined,
      limit,
    })

    return NextResponse.json({ data: users })
  } catch (error) {
    console.error('Error searching users:', error)
    return NextResponse.json(
      { error: 'Failed to search users' },
      { status: 500 }
    )
  }
}

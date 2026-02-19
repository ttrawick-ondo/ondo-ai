import { NextResponse } from 'next/server'
import type { ProvidersResponse } from '@/types'
import { getAllProviders, getEnabledModels } from '@/lib/api/providers'
import { requireSession, unauthorizedResponse } from '@/lib/auth/session'

export async function GET() {
  try {
    const session = await requireSession()
    if (!session) return unauthorizedResponse()

    const providers = getAllProviders()
    const models = getEnabledModels()

    const response: ProvidersResponse = {
      providers,
      models,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Providers API error:', error)

    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch providers',
      },
      { status: 500 }
    )
  }
}

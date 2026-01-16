import { NextResponse } from 'next/server'
import type { ProvidersResponse } from '@/types'
import { getAllProviders, getEnabledModels } from '@/lib/api/providers'

export async function GET() {
  try {
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
        message: error instanceof Error ? error.message : 'Failed to fetch providers',
      },
      { status: 500 }
    )
  }
}

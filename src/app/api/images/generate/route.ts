import { NextRequest, NextResponse } from 'next/server'
import { getDALLEService, type ImageGenerationRequest } from '@/lib/api/images'
import { requireSession, unauthorizedResponse } from '@/lib/auth/session'
import { checkRateLimit, rateLimitResponse } from '@/lib/auth/rate-limit'

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession()
    if (!session) return unauthorizedResponse()

    // Rate limit: 10 requests per minute per user
    const { limited, resetMs } = checkRateLimit(`images:${session.user.id}`, 10)
    if (limited) return rateLimitResponse(resetMs)

    const body = await request.json() as ImageGenerationRequest

    if (!body.prompt || body.prompt.trim().length === 0) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    const dalleService = getDALLEService()
    const result = await dalleService.generateImage({
      prompt: body.prompt,
      size: body.size,
      quality: body.quality,
      style: body.style,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: 'Image generation failed' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      images: result.images,
    })
  } catch (error) {
    console.error('Image generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate image' },
      { status: 500 }
    )
  }
}

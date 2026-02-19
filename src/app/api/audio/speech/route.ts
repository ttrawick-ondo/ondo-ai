import { NextRequest, NextResponse } from 'next/server'
import { getTTSService, type TTSRequest, type TTSVoice, type TTSModel } from '@/lib/api/audio'
import { requireSession, unauthorizedResponse } from '@/lib/auth/session'
import { checkRateLimit, rateLimitResponse } from '@/lib/auth/rate-limit'

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession()
    if (!session) return unauthorizedResponse()

    // Rate limit: 10 requests per minute per user
    const { limited, resetMs } = checkRateLimit(`audio:${session.user.id}`, 10)
    if (limited) return rateLimitResponse(resetMs)

    const body = await request.json() as TTSRequest

    if (!body.text || body.text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      )
    }

    // Validate text length (OpenAI has a 4096 character limit)
    if (body.text.length > 4096) {
      return NextResponse.json(
        { error: 'Text exceeds maximum length of 4096 characters' },
        { status: 400 }
      )
    }

    const ttsService = getTTSService()
    const result = await ttsService.speak({
      text: body.text,
      voice: body.voice as TTSVoice,
      model: body.model as TTSModel,
      speed: body.speed,
    })

    if (!result.success || !result.audioBuffer) {
      return NextResponse.json(
        { error: 'Failed to generate speech' },
        { status: 500 }
      )
    }

    // Return audio as binary response
    return new NextResponse(result.audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': result.audioBuffer.byteLength.toString(),
      },
    })
  } catch (error) {
    console.error('TTS error:', error)
    return NextResponse.json(
      { error: 'Failed to generate speech' },
      { status: 500 }
    )
  }
}

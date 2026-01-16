import { NextRequest, NextResponse } from 'next/server'
import { getDALLEService, type ImageGenerationRequest } from '@/lib/api/images'

export async function POST(request: NextRequest) {
  try {
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
        { error: result.error },
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
      { error: error instanceof Error ? error.message : 'Failed to generate image' },
      { status: 500 }
    )
  }
}

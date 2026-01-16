/**
 * DALL-E Image Generation Service
 * Integrates with OpenAI's DALL-E 3 API for AI image generation
 */

import OpenAI from 'openai'

export interface ImageGenerationRequest {
  prompt: string
  size?: '1024x1024' | '1792x1024' | '1024x1792'
  quality?: 'standard' | 'hd'
  style?: 'vivid' | 'natural'
  n?: number
}

export interface GeneratedImage {
  url: string
  revisedPrompt: string
  size: string
  createdAt: Date
}

export interface ImageGenerationResult {
  success: boolean
  images?: GeneratedImage[]
  error?: string
}

export class DALLEService {
  private client: OpenAI

  constructor(apiKey?: string) {
    this.client = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY,
    })
  }

  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
    try {
      const response = await this.client.images.generate({
        model: 'dall-e-3',
        prompt: request.prompt,
        size: request.size || '1024x1024',
        quality: request.quality || 'standard',
        style: request.style || 'vivid',
        n: 1, // DALL-E 3 only supports n=1
        response_format: 'url',
      })

      const images: GeneratedImage[] = (response.data || []).map((img) => ({
        url: img.url!,
        revisedPrompt: img.revised_prompt || request.prompt,
        size: request.size || '1024x1024',
        createdAt: new Date(),
      }))

      return {
        success: true,
        images,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Image generation failed'
      return {
        success: false,
        error: message,
      }
    }
  }

  async generateImageAsBase64(request: ImageGenerationRequest): Promise<ImageGenerationResult & { base64?: string }> {
    try {
      const response = await this.client.images.generate({
        model: 'dall-e-3',
        prompt: request.prompt,
        size: request.size || '1024x1024',
        quality: request.quality || 'standard',
        style: request.style || 'vivid',
        n: 1,
        response_format: 'b64_json',
      })

      const img = response.data?.[0]
      if (!img) {
        return { success: false, error: 'No image data returned' }
      }
      return {
        success: true,
        base64: img.b64_json,
        images: [{
          url: `data:image/png;base64,${img.b64_json}`,
          revisedPrompt: img.revised_prompt || request.prompt,
          size: request.size || '1024x1024',
          createdAt: new Date(),
        }],
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Image generation failed'
      return {
        success: false,
        error: message,
      }
    }
  }
}

// Singleton instance
let dalleService: DALLEService | null = null

export function getDALLEService(): DALLEService {
  if (!dalleService) {
    dalleService = new DALLEService()
  }
  return dalleService
}

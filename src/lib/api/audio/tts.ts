/**
 * Text-to-Speech Service
 * Integrates with OpenAI's TTS API
 */

import OpenAI from 'openai'

export type TTSVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'
export type TTSModel = 'tts-1' | 'tts-1-hd'

export interface TTSRequest {
  text: string
  voice?: TTSVoice
  model?: TTSModel
  speed?: number // 0.25 to 4.0
}

export interface TTSResult {
  success: boolean
  audioBuffer?: ArrayBuffer
  error?: string
}

export const TTS_VOICES: { id: TTSVoice; name: string; description: string }[] = [
  { id: 'alloy', name: 'Alloy', description: 'Neutral and balanced' },
  { id: 'echo', name: 'Echo', description: 'Warm and conversational' },
  { id: 'fable', name: 'Fable', description: 'British and expressive' },
  { id: 'onyx', name: 'Onyx', description: 'Deep and authoritative' },
  { id: 'nova', name: 'Nova', description: 'Friendly and upbeat' },
  { id: 'shimmer', name: 'Shimmer', description: 'Clear and pleasant' },
]

export class TTSService {
  private client: OpenAI

  constructor(apiKey?: string) {
    this.client = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY,
    })
  }

  async speak(request: TTSRequest): Promise<TTSResult> {
    try {
      const { text, voice = 'nova', model = 'tts-1', speed = 1.0 } = request

      if (!text || text.trim().length === 0) {
        return {
          success: false,
          error: 'Text cannot be empty',
        }
      }

      // Validate speed
      const validSpeed = Math.max(0.25, Math.min(4.0, speed))

      const response = await this.client.audio.speech.create({
        model,
        voice,
        input: text,
        speed: validSpeed,
        response_format: 'mp3',
      })

      const arrayBuffer = await response.arrayBuffer()

      return {
        success: true,
        audioBuffer: arrayBuffer,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'TTS failed'
      return {
        success: false,
        error: message,
      }
    }
  }

  async speakToBase64(request: TTSRequest): Promise<TTSResult & { base64?: string }> {
    const result = await this.speak(request)

    if (!result.success || !result.audioBuffer) {
      return result
    }

    const base64 = Buffer.from(result.audioBuffer).toString('base64')
    return {
      ...result,
      base64,
    }
  }
}

// Singleton instance
let ttsService: TTSService | null = null

export function getTTSService(): TTSService {
  if (!ttsService) {
    ttsService = new TTSService()
  }
  return ttsService
}

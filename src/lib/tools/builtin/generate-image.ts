/**
 * Image Generation Tool
 * Allows AI to generate images using DALL-E 3
 */

import { createTool } from '../registry'
import type { ToolResult } from '@/types/tools'

export const generateImageTool = createTool(
  'generate_image',
  'Generate an image using DALL-E 3 based on a text description. Use this when the user asks you to create, draw, or generate an image.',
  {
    type: 'object',
    properties: {
      prompt: {
        type: 'string',
        description: 'A detailed description of the image to generate. Be specific about style, composition, colors, and mood.',
      },
      size: {
        type: 'string',
        enum: ['1024x1024', '1792x1024', '1024x1792'],
        description: 'Image size. Use 1024x1024 for square, 1792x1024 for landscape, 1024x1792 for portrait.',
      },
      quality: {
        type: 'string',
        enum: ['standard', 'hd'],
        description: 'Image quality. HD takes longer but produces more detailed images.',
      },
      style: {
        type: 'string',
        enum: ['vivid', 'natural'],
        description: 'Vivid creates hyper-real and dramatic images. Natural produces more realistic, less exaggerated images.',
      },
    },
    required: ['prompt'],
  },
  async (args): Promise<ToolResult> => {
    try {
      const prompt = args.prompt as string
      const size = (args.size as string) || '1024x1024'
      const quality = (args.quality as string) || 'standard'
      const style = (args.style as string) || 'vivid'

      if (!prompt || prompt.trim().length === 0) {
        return {
          success: false,
          output: '',
          error: 'Prompt cannot be empty',
        }
      }

      // Call the API endpoint
      const response = await fetch('/api/images/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, size, quality, style }),
      })

      if (!response.ok) {
        const error = await response.json()
        return {
          success: false,
          output: '',
          error: error.error || 'Failed to generate image',
        }
      }

      const result = await response.json()
      const image = result.images[0]

      return {
        success: true,
        output: `Generated image successfully.\n\nRevised prompt: ${image.revisedPrompt}\nSize: ${image.size}\nURL: ${image.url}`,
        metadata: {
          imageUrl: image.url,
          revisedPrompt: image.revisedPrompt,
          size: image.size,
          originalPrompt: prompt,
        },
      }
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : 'Image generation failed',
      }
    }
  }
)

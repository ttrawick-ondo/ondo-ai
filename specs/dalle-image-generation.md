# Feature: DALL-E Image Generation

## Overview
Enable AI-powered image generation in chat using OpenAI's DALL-E 3 API.

## Requirements

### 1. Image Generation Service (`src/lib/api/images/`)
- Create `ImageGenerationService` wrapping DALL-E 3 API
- Support different sizes: 1024x1024, 1792x1024, 1024x1792
- Support quality settings: standard, hd
- Return both URL and base64 options

### 2. Image Generation Tool (`src/lib/tools/builtin/`)
- Register `generate_image` tool for function calling
- Parameters: prompt, size, quality, style (vivid/natural)
- AI can generate images when user requests

### 3. API Endpoint
- POST `/api/images/generate` - Generate image from prompt
- Return image URL and metadata

### 4. UI Components
- `ImageGenerationButton` in chat input toolbar
- `GeneratedImageDisplay` for showing generated images
- Loading state with progress indicator
- Download and copy URL actions

### 5. Chat Integration
- Display generated images inline in messages
- Store image metadata in message attachments
- Support regeneration with modified prompts

## Technical Details

```typescript
interface ImageGenerationRequest {
  prompt: string
  size?: '1024x1024' | '1792x1024' | '1024x1792'
  quality?: 'standard' | 'hd'
  style?: 'vivid' | 'natural'
}

interface GeneratedImage {
  url: string
  revisedPrompt: string
  size: string
  createdAt: Date
}
```

## Files to Create
- `src/lib/api/images/index.ts`
- `src/lib/api/images/dalle.ts`
- `src/lib/tools/builtin/generate-image.ts`
- `src/app/api/images/generate/route.ts`
- `src/components/chat/ImageGeneration.tsx`

## Testing
- Unit tests for DALL-E service
- Integration test for image generation API
- Mock responses for development

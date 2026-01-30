# Feature: Text-to-Speech with OpenAI TTS

## Overview
Add text-to-speech capabilities to read AI responses aloud using OpenAI's TTS API.

## Requirements

### 1. TTS Service (`src/lib/api/audio/`)
- Create `TTSService` wrapping OpenAI TTS API
- Support voices: alloy, echo, fable, onyx, nova, shimmer
- Support models: tts-1 (fast), tts-1-hd (quality)
- Stream audio for long responses

### 2. API Endpoint
- POST `/api/audio/speech` - Convert text to speech
- Return audio stream or blob
- Support chunked transfer for streaming

### 3. Audio Player Component
- `AudioPlayer` component for message playback
- Play/pause/stop controls
- Progress bar and time display
- Speed control (0.5x - 2x)
- Voice selection dropdown

### 4. Message Integration
- Add "Read aloud" button to assistant messages
- Auto-play option in settings
- Queue multiple messages for continuous playback
- Stop playback when new message arrives

### 5. Settings
- Default voice preference
- Default speed preference
- Auto-play toggle
- TTS model selection (speed vs quality)

## Technical Details

```typescript
interface TTSRequest {
  text: string
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'
  model?: 'tts-1' | 'tts-1-hd'
  speed?: number // 0.25 to 4.0
}

interface TTSService {
  speak(text: string, options?: TTSOptions): Promise<Blob>
  streamSpeak(text: string, options?: TTSOptions): ReadableStream<Uint8Array>
}
```

## Files to Create
- `src/lib/api/audio/index.ts`
- `src/lib/api/audio/tts.ts`
- `src/app/api/audio/speech/route.ts`
- `src/components/chat/AudioPlayer.tsx`
- `src/components/chat/ReadAloudButton.tsx`
- `src/hooks/useAudioPlayer.ts`

## Testing
- Unit tests for TTS service
- Component tests for AudioPlayer
- Integration test for speech API

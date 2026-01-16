'use client'

import { useState, useRef, useEffect } from 'react'
import { Play, Pause, Square, Volume2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip'
import { TTS_VOICES, type TTSVoice } from '@/lib/api/audio'

interface ReadAloudButtonProps {
  text: string
  className?: string
}

export function ReadAloudButton({ text, className }: ReadAloudButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [voice, setVoice] = useState<TTSVoice>('nova')
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioUrlRef = useRef<string | null>(null)

  const handlePlay = async () => {
    if (isPlaying && audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
      return
    }

    // If we already have audio loaded, just play it
    if (audioRef.current && audioUrlRef.current) {
      audioRef.current.play()
      setIsPlaying(true)
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/audio/speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate speech')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)

      // Clean up previous URL
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current)
      }

      audioUrlRef.current = url
      audioRef.current = new Audio(url)

      audioRef.current.onended = () => {
        setIsPlaying(false)
      }

      audioRef.current.onerror = () => {
        setIsPlaying(false)
        setIsLoading(false)
      }

      await audioRef.current.play()
      setIsPlaying(true)
    } catch (error) {
      console.error('TTS error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    setIsPlaying(false)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current)
      }
      if (audioRef.current) {
        audioRef.current.pause()
      }
    }
  }, [])

  // Reset audio when voice changes
  useEffect(() => {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current)
      audioUrlRef.current = null
    }
    audioRef.current = null
    setIsPlaying(false)
  }, [voice])

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handlePlay}
              disabled={isLoading || !text}
            >
              {isLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : isPlaying ? (
                <Pause className="h-3.5 w-3.5" />
              ) : (
                <Volume2 className="h-3.5 w-3.5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            {isPlaying ? 'Pause' : 'Read aloud'}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {isPlaying && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleStop}
              >
                <Square className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Stop</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      <Select value={voice} onValueChange={(v) => setVoice(v as TTSVoice)}>
        <SelectTrigger className="h-7 w-24 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TTS_VOICES.map((v) => (
            <SelectItem key={v.id} value={v.id} className="text-xs">
              <div>
                <div>{v.name}</div>
                <div className="text-[10px] text-muted-foreground">{v.description}</div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

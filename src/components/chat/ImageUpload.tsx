'use client'

import { useCallback, useState, useRef, useEffect } from 'react'
import { ImagePlus, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import type { ImageAttachment } from '@/types'
import { generateId } from '@/lib/utils'

interface ImageUploadProps {
  images: ImageAttachment[]
  onImagesChange: (images: ImageAttachment[]) => void
  disabled?: boolean
  maxImages?: number
  maxSizeMB?: number
}

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
const DEFAULT_MAX_SIZE_MB = 20
const DEFAULT_MAX_IMAGES = 10

export function ImageUpload({
  images,
  onImagesChange,
  disabled,
  maxImages = DEFAULT_MAX_IMAGES,
  maxSizeMB = DEFAULT_MAX_SIZE_MB,
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `Invalid file type: ${file.type}. Allowed: PNG, JPEG, GIF, WebP`
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      return `File too large: ${(file.size / (1024 * 1024)).toFixed(1)}MB. Max: ${maxSizeMB}MB`
    }
    return null
  }

  const processFile = async (file: File): Promise<ImageAttachment | null> => {
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return null
    }

    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const base64 = e.target?.result as string

        // Get image dimensions
        const img = new Image()
        img.onload = () => {
          resolve({
            id: generateId(),
            type: 'image',
            name: file.name,
            url: base64,
            mimeType: file.type,
            size: file.size,
            width: img.width,
            height: img.height,
            base64,
            detail: 'auto',
          })
        }
        img.onerror = () => {
          resolve(null)
        }
        img.src = base64
      }
      reader.onerror = () => {
        resolve(null)
      }
      reader.readAsDataURL(file)
    })
  }

  const processFiles = async (files: FileList | File[]) => {
    if (images.length >= maxImages) {
      setError(`Maximum ${maxImages} images allowed`)
      return
    }

    setIsProcessing(true)
    setError(null)

    const fileArray = Array.from(files).slice(0, maxImages - images.length)
    const newImages: ImageAttachment[] = []

    for (const file of fileArray) {
      const processed = await processFile(file)
      if (processed) {
        newImages.push(processed)
      }
    }

    if (newImages.length > 0) {
      onImagesChange([...images, ...newImages])
    }

    setIsProcessing(false)
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      if (disabled) return

      const files = e.dataTransfer.files
      if (files.length > 0) {
        await processFiles(files)
      }
    },
    [disabled, images, maxImages]
  )

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      await processFiles(files)
    }
    // Reset input
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  const handlePaste = useCallback(
    async (e: ClipboardEvent) => {
      if (disabled) return

      const items = e.clipboardData?.items
      if (!items) return

      const imageItems = Array.from(items).filter(
        (item) => item.type.startsWith('image/')
      )

      if (imageItems.length > 0) {
        e.preventDefault()
        const files = imageItems
          .map((item) => item.getAsFile())
          .filter((f): f is File => f !== null)
        await processFiles(files)
      }
    },
    [disabled, images, maxImages]
  )

  // Attach paste listener to document
  useEffect(() => {
    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [handlePaste])

  const removeImage = (id: string) => {
    onImagesChange(images.filter((img) => img.id !== id))
  }

  return (
    <div
      className={cn(
        'relative',
        isDragging && 'ring-2 ring-primary ring-offset-2 rounded-lg'
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        multiple
        className="hidden"
        onChange={handleFileSelect}
        disabled={disabled || isProcessing}
      />

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => inputRef.current?.click()}
              disabled={disabled || isProcessing || images.length >= maxImages}
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ImagePlus className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            {images.length >= maxImages
              ? `Max ${maxImages} images`
              : 'Add image (drag, paste, or click)'}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {error && (
        <div className="absolute bottom-full left-0 mb-2 text-xs text-destructive bg-destructive/10 px-2 py-1 rounded">
          {error}
        </div>
      )}
    </div>
  )
}

interface ImagePreviewListProps {
  images: ImageAttachment[]
  onRemove: (id: string) => void
  disabled?: boolean
}

export function ImagePreviewList({ images, onRemove, disabled }: ImagePreviewListProps) {
  if (images.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2 mb-2">
      {images.map((image) => (
        <div
          key={image.id}
          className="relative group rounded-lg overflow-hidden border bg-muted"
          style={{ width: 80, height: 80 }}
        >
          <img
            src={image.url}
            alt={image.name}
            className="w-full h-full object-cover"
          />
          {!disabled && (
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-0.5 right-0.5 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => onRemove(image.id)}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      ))}
    </div>
  )
}

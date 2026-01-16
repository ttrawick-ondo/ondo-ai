'use client'

import { useState, useRef, useCallback } from 'react'
import { Paperclip, Upload, X, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { validateFile, getAcceptedFileTypes, formatFileSize } from '@/lib/files/types'
import { createFileAttachment } from '@/lib/files/processor'
import type { FileAttachment } from '@/types/chat'

interface FileUploadProps {
  onFilesSelected: (files: FileAttachment[]) => void
  disabled?: boolean
  maxFiles?: number
  className?: string
}

export function FileUpload({
  onFilesSelected,
  disabled = false,
  maxFiles = 5,
  className,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback(async (fileList: FileList) => {
    const files = Array.from(fileList).slice(0, maxFiles)
    const newErrors: string[] = []
    const validFiles: File[] = []

    for (const file of files) {
      const validation = validateFile(file)
      if (validation.valid) {
        validFiles.push(file)
      } else {
        newErrors.push(`${file.name}: ${validation.error}`)
      }
    }

    setErrors(newErrors)

    if (validFiles.length > 0) {
      const attachments = await Promise.all(
        validFiles.map(file => createFileAttachment(file))
      )
      onFilesSelected(attachments)
    }
  }, [maxFiles, onFilesSelected])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) {
      setIsDragging(true)
    }
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (disabled) return

    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFiles(files)
    }
  }, [disabled, handleFiles])

  const handleClick = () => {
    if (!disabled) {
      inputRef.current?.click()
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFiles(files)
    }
    // Reset input so the same file can be selected again
    e.target.value = ''
  }

  const clearErrors = () => setErrors([])

  return (
    <div className={cn('relative', className)}>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={getAcceptedFileTypes()}
        onChange={handleChange}
        className="hidden"
        disabled={disabled}
      />

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn(
                'h-8 w-8 shrink-0',
                isDragging && 'bg-primary/10'
              )}
              disabled={disabled}
              onClick={handleClick}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            Attach files (PDF, code, text)
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Error messages */}
      {errors.length > 0 && (
        <div className="absolute bottom-full left-0 mb-2 w-64 p-2 bg-destructive/10 border border-destructive/20 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1 text-xs text-destructive">
              {errors.map((error, i) => (
                <p key={i}>{error}</p>
              ))}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4 shrink-0"
              onClick={clearErrors}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// Drag and drop zone for larger areas
interface FileDropZoneProps {
  onFilesSelected: (files: FileAttachment[]) => void
  disabled?: boolean
  maxFiles?: number
  children?: React.ReactNode
  className?: string
}

export function FileDropZone({
  onFilesSelected,
  disabled = false,
  maxFiles = 5,
  children,
  className,
}: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)

  const handleFiles = useCallback(async (fileList: FileList) => {
    const files = Array.from(fileList).slice(0, maxFiles)
    const validFiles: File[] = []

    for (const file of files) {
      const validation = validateFile(file)
      if (validation.valid) {
        validFiles.push(file)
      }
    }

    if (validFiles.length > 0) {
      const attachments = await Promise.all(
        validFiles.map(file => createFileAttachment(file))
      )
      onFilesSelected(attachments)
    }
  }, [maxFiles, onFilesSelected])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) {
      setIsDragging(true)
    }
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Only set to false if we're leaving the drop zone entirely
    const rect = e.currentTarget.getBoundingClientRect()
    if (
      e.clientX < rect.left ||
      e.clientX >= rect.right ||
      e.clientY < rect.top ||
      e.clientY >= rect.bottom
    ) {
      setIsDragging(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (disabled) return

    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFiles(files)
    }
  }, [disabled, handleFiles])

  return (
    <div
      className={cn(
        'relative transition-colors',
        isDragging && 'bg-primary/5',
        className
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {children}

      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 flex items-center justify-center bg-primary/10 border-2 border-dashed border-primary rounded-lg z-50">
          <div className="text-center p-4">
            <Upload className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="text-sm font-medium text-primary">Drop files here</p>
            <p className="text-xs text-muted-foreground">PDF, code, or text files</p>
          </div>
        </div>
      )}
    </div>
  )
}

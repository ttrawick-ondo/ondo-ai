'use client'

import { useState, useRef, useEffect, useCallback, KeyboardEvent } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ModelSelector } from '@/components/model'
import { ToolSelector } from './ToolSelector'
import { ImageUpload, ImagePreviewList } from './ImageUpload'
import { FileUpload, FileDropZone } from './FileUpload'
import { FilePreviewList } from './FilePreview'
import { PromptSelector } from './PromptSelector'
import { useChatActions, useIsStreaming, useUserPreferences, useChatStore, useActiveWorkspace } from '@/stores'
import type { ImageAttachment, FileAttachment } from '@/types'

interface ChatInputProps {
  conversationId: string
}

export function ChatInput({ conversationId }: ChatInputProps) {
  const [message, setMessage] = useState('')
  const [images, setImages] = useState<ImageAttachment[]>([])
  const [files, setFiles] = useState<FileAttachment[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const { sendMessage, updateConversationModel } = useChatActions()
  const isStreaming = useIsStreaming()
  const preferences = useUserPreferences()
  const conversation = useChatStore((state) => state.conversations[conversationId])
  const workspace = useActiveWorkspace()

  const selectedModelId = conversation?.modelId || preferences.defaultModelId || 'claude-sonnet-4-20250514'

  const handleFilesSelected = useCallback((newFiles: FileAttachment[]) => {
    setFiles((prev) => [...prev, ...newFiles].slice(0, 5)) // Max 5 files
  }, [])

  const handleModelSelect = (modelId: string) => {
    updateConversationModel(conversationId, modelId)
  }

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [message])

  // Handle paste events for images
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return

    const imageItems = Array.from(items).filter(
      (item) => item.type.startsWith('image/')
    )

    if (imageItems.length > 0 && images.length < 10) {
      // Let ImageUpload handle the paste via document listener
      // This is a fallback that could be used if needed
    }
  }, [images])

  const handleSubmit = async () => {
    const hasContent = message.trim() || images.length > 0 || files.length > 0
    if (!hasContent || isStreaming) return

    const content = message.trim()

    // Build image attachments
    const imageAttachments = images.map((img) => ({
      id: img.id,
      type: 'image' as const,
      name: img.name,
      url: img.url,
      mimeType: img.mimeType,
      size: img.size,
      base64: img.base64,
      width: img.width,
      height: img.height,
      detail: img.detail,
    }))

    // Build file attachments
    const fileAttachments = files
      .filter((f) => f.status === 'ready')
      .map((f) => ({
        id: f.id,
        type: 'file' as const,
        name: f.name,
        url: f.url,
        mimeType: f.mimeType,
        size: f.size,
        fileType: f.fileType,
        status: f.status,
        content: f.content,
        language: f.language,
      }))

    const allAttachments = [...imageAttachments, ...fileAttachments]

    setMessage('')
    setImages([])
    setFiles([])

    // Generate default content if needed
    let finalContent = content
    if (!finalContent) {
      if (images.length > 0) {
        finalContent = 'Please describe this image.'
      } else if (files.length > 0) {
        finalContent = 'Please analyze these files.'
      }
    }

    await sendMessage({
      content: finalContent,
      modelId: selectedModelId,
      attachments: allAttachments.length > 0 ? allAttachments : undefined,
    })
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && preferences.sendWithEnter) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const hasAttachments = images.length > 0 || files.length > 0

  return (
    <FileDropZone
      onFilesSelected={handleFilesSelected}
      disabled={isStreaming}
      className="relative"
    >
      <div ref={containerRef}>
        {/* Attachment previews */}
        {hasAttachments && (
          <div className="mb-2 space-y-2">
            {images.length > 0 && (
              <ImagePreviewList
                images={images}
                onRemove={(id) => setImages(images.filter((img) => img.id !== id))}
                disabled={isStreaming}
              />
            )}
            {files.length > 0 && (
              <FilePreviewList
                files={files}
                onRemove={(id) => setFiles(files.filter((f) => f.id !== id))}
              />
            )}
          </div>
        )}

        <div className="flex items-end gap-2 rounded-2xl border bg-background p-2 shadow-sm focus-within:ring-1 focus-within:ring-ring">
          <ModelSelector
            selectedModelId={selectedModelId}
            onModelSelect={handleModelSelect}
            workspaceId={workspace?.id}
            compact
            disabled={isStreaming}
          />

          <ToolSelector />

          <ImageUpload
            images={images}
            onImagesChange={setImages}
            disabled={isStreaming}
          />

          <FileUpload
            onFilesSelected={handleFilesSelected}
            disabled={isStreaming}
            maxFiles={5 - files.length}
          />

          <PromptSelector
            onSelect={(content) => setMessage(content)}
            disabled={isStreaming}
          />

          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            disabled={isStreaming}
            className={cn(
              'min-h-[40px] max-h-[200px] flex-1 resize-none border-0 bg-transparent px-2 py-2 text-sm focus-visible:ring-0 focus-visible:ring-offset-0',
              isStreaming && 'opacity-50'
            )}
            rows={1}
          />

          <Button
            size="icon"
            className="h-9 w-9 shrink-0 rounded-xl"
            onClick={handleSubmit}
            disabled={(!message.trim() && !hasAttachments) || isStreaming}
          >
            {isStreaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        <p className="mt-2 text-center text-xs text-muted-foreground">
          {preferences.sendWithEnter ? (
            <>
              Press <kbd className="rounded border px-1">Enter</kbd> to send,{' '}
              <kbd className="rounded border px-1">Shift + Enter</kbd> for new line
            </>
          ) : (
            <>
              Press <kbd className="rounded border px-1">⌘ + Enter</kbd> to send
            </>
          )}
        </p>
      </div>
    </FileDropZone>
  )
}

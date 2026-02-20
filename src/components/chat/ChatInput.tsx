'use client'

import { useState, useRef, useEffect, useCallback, KeyboardEvent } from 'react'
import { Send, Loader2, ArrowUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ModelSelector } from '@/components/model'
import { ToolSelector } from './ToolSelector'
import { ImageUpload, ImagePreviewList } from './ImageUpload'
import { FileUpload, FileDropZone } from './FileUpload'
import { FilePreviewList } from './FilePreview'
import { PromptSelector } from './PromptSelector'
import { useChatActions, useIsStreaming, useUserPreferences, useChatStore, useActiveWorkspaceId, useModels } from '@/stores'
import { useWorkspace } from '@/lib/queries'
import type { ImageAttachment, FileAttachment } from '@/types'

interface ChatInputProps {
  conversationId: string
  onHeightChange?: () => void
}

export function ChatInput({ conversationId, onHeightChange }: ChatInputProps) {
  const [message, setMessage] = useState('')
  const [images, setImages] = useState<ImageAttachment[]>([])
  const [files, setFiles] = useState<FileAttachment[]>([])
  const [activePromptName, setActivePromptName] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const { sendMessage, updateConversationModel } = useChatActions()
  const isStreaming = useIsStreaming()
  const preferences = useUserPreferences()
  const conversation = useChatStore((state) => state.conversations[conversationId])
  const activeWorkspaceId = useActiveWorkspaceId()
  const { data: workspace } = useWorkspace(activeWorkspaceId)

  const selectedModelId = conversation?.modelId || preferences.defaultModelId || 'claude-sonnet-4-20250514'
  const models = useModels()
  const selectedModel = models.find((m) => m.id === selectedModelId)
  const supportsTools = selectedModel?.capabilities?.functionCalling ?? false

  const handleFilesSelected = useCallback((newFiles: FileAttachment[]) => {
    setFiles((prev) => [...prev, ...newFiles].slice(0, 5)) // Max 5 files
  }, [])

  const handleModelSelect = (modelId: string) => {
    updateConversationModel(conversationId, modelId)
  }

  const handlePromptSelect = (content: string, promptName: string) => {
    setMessage(content)
    setActivePromptName(promptName)
    setTimeout(() => textareaRef.current?.focus(), 0)
  }

  const clearPromptContext = () => {
    setActivePromptName(null)
  }

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
    if (!e.target.value.trim()) {
      clearPromptContext()
    }
  }

  // Auto-resize textarea and notify parent
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
    onHeightChange?.()
  }, [message, onHeightChange])

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return

    const imageItems = Array.from(items).filter(
      (item) => item.type.startsWith('image/')
    )

    if (imageItems.length > 0 && images.length < 10) {
      // Let ImageUpload handle the paste via document listener
    }
  }, [images])

  const handleSubmit = async () => {
    const hasContent = message.trim() || images.length > 0 || files.length > 0
    if (!hasContent || isStreaming) return

    const content = message.trim()

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
    clearPromptContext()

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
      conversationId,
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
  const canSend = (message.trim() || hasAttachments) && !isStreaming

  return (
    <FileDropZone
      onFilesSelected={handleFilesSelected}
      disabled={isStreaming}
      className="relative"
    >
      <div ref={containerRef} className="pb-3 pt-1">
        {/* Attachment previews — above the input */}
        {hasAttachments && (
          <div className="space-y-2 mb-2">
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

        {/* Unified input container */}
        <div className="rounded-xl border border-border/60 bg-muted/30 focus-within:border-border focus-within:bg-muted/50 transition-colors">
          {/* Prompt template indicator */}
          {activePromptName && (
            <div className="flex items-center justify-between px-4 py-1.5 border-b border-border/40">
              <span className="text-xs text-muted-foreground">
                Using: <span className="font-medium text-foreground">{activePromptName}</span>
              </span>
              <button
                onClick={clearPromptContext}
                className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear
              </button>
            </div>
          )}

          {/* Textarea — auto-growing, minimal chrome */}
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleMessageChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="Type your message..."
            disabled={isStreaming}
            rows={1}
            className={cn(
              'block w-full resize-none bg-transparent px-4 py-3 text-sm leading-relaxed',
              'placeholder:text-muted-foreground/60',
              'focus:outline-none',
              'disabled:cursor-not-allowed disabled:opacity-50',
              isStreaming && 'opacity-50'
            )}
            style={{ minHeight: '44px', maxHeight: '200px' }}
          />

          {/* Toolbar — seamless bottom strip */}
          <div className="flex items-center justify-between px-2 py-1.5">
            <div className="flex items-center gap-0.5">
              <ModelSelector
                selectedModelId={selectedModelId}
                onModelSelect={handleModelSelect}
                workspaceId={workspace?.id}
                compact
                disabled={isStreaming}
              />

              <div className="w-px h-4 bg-border/60 mx-1" />

              <ToolSelector
                supportsTools={supportsTools}
                modelName={selectedModel?.name}
              />

              <div className="w-px h-4 bg-border/60 mx-1" />

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
                onSelect={handlePromptSelect}
                disabled={isStreaming}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground/60 hidden sm:block">
                {preferences.sendWithEnter ? (
                  <kbd className="font-mono">Enter</kbd>
                ) : (
                  <kbd className="font-mono">⌘↵</kbd>
                )}
              </span>

              <Button
                size="icon"
                className={cn(
                  'h-7 w-7 rounded-lg transition-colors',
                  canSend
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'bg-muted text-muted-foreground'
                )}
                onClick={handleSubmit}
                disabled={!canSend}
              >
                {isStreaming ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ArrowUp className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </FileDropZone>
  )
}

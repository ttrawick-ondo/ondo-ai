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
import { useChatActions, useIsStreaming, useUserPreferences, useChatStore, useActiveWorkspaceId, useModels } from '@/stores'
import { useWorkspace } from '@/lib/queries'
import type { ImageAttachment, FileAttachment } from '@/types'

interface ChatInputProps {
  conversationId: string
}

export function ChatInput({ conversationId }: ChatInputProps) {
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
    // Focus the textarea so user can edit
    setTimeout(() => textareaRef.current?.focus(), 0)
  }

  const clearPromptContext = () => {
    setActivePromptName(null)
  }

  // Clear prompt context when user significantly edits the message
  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
    // If user clears the message, clear the prompt context
    if (!e.target.value.trim()) {
      clearPromptContext()
    }
  }

  // Handle paste events for images
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
    clearPromptContext()

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

  return (
    <FileDropZone
      onFilesSelected={handleFilesSelected}
      disabled={isStreaming}
      className="relative"
    >
      <div ref={containerRef} className="space-y-3">
        {/* Attachment previews */}
        {hasAttachments && (
          <div className="space-y-2">
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

        {/* Main input container */}
        <div className="rounded-2xl border bg-background shadow-sm focus-within:ring-1 focus-within:ring-ring overflow-hidden">
          {/* Prompt template indicator */}
          {activePromptName && (
            <div className="flex items-center justify-between px-4 py-2 bg-primary/5 border-b">
              <span className="text-xs text-muted-foreground">
                Using template: <span className="font-medium text-foreground">{activePromptName}</span>
              </span>
              <button
                onClick={clearPromptContext}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            </div>
          )}

          {/* Textarea - full width, larger */}
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleMessageChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="Type your message..."
            disabled={isStreaming}
            className={cn(
              'min-h-[120px] max-h-[300px] w-full resize-none border-0 bg-transparent p-4 text-sm focus-visible:ring-0 focus-visible:ring-offset-0',
              isStreaming && 'opacity-50'
            )}
            rows={4}
          />

          {/* Toolbar */}
          <div className="flex items-center justify-between border-t px-2 py-2">
            <div className="flex items-center gap-1">
              <ModelSelector
                selectedModelId={selectedModelId}
                onModelSelect={handleModelSelect}
                workspaceId={workspace?.id}
                compact
                disabled={isStreaming}
              />

              <div className="w-px h-6 bg-border mx-1" />

              <ToolSelector
                supportsTools={supportsTools}
                modelName={selectedModel?.name}
              />

              <div className="w-px h-6 bg-border mx-1" />

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
              <span className="text-xs text-muted-foreground hidden sm:block">
                {preferences.sendWithEnter ? (
                  <>
                    <kbd className="rounded border px-1 py-0.5 text-[10px]">Enter</kbd> to send
                  </>
                ) : (
                  <>
                    <kbd className="rounded border px-1 py-0.5 text-[10px]">⌘↵</kbd> to send
                  </>
                )}
              </span>

              <Button
                size="sm"
                className="h-8 px-4 rounded-lg"
                onClick={handleSubmit}
                disabled={(!message.trim() && !hasAttachments) || isStreaming}
              >
                {isStreaming ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </FileDropZone>
  )
}

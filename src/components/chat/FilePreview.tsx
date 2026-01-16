'use client'

import { useState } from 'react'
import {
  File,
  FileText,
  FileCode,
  Image,
  X,
  AlertCircle,
  Loader2,
  Download,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { formatFileSize } from '@/lib/files/types'
import { CodeBlock } from './CodeBlock'
import type { FileAttachment, FileType } from '@/types/chat'

interface FilePreviewProps {
  file: FileAttachment
  onRemove?: () => void
  showContent?: boolean
  className?: string
}

function getFileIcon(fileType: FileType) {
  switch (fileType) {
    case 'pdf':
      return <FileText className="h-4 w-4 text-red-500" />
    case 'code':
      return <FileCode className="h-4 w-4 text-blue-500" />
    case 'document':
      return <FileText className="h-4 w-4 text-blue-600" />
    case 'text':
      return <File className="h-4 w-4 text-gray-500" />
    case 'image':
      return <Image className="h-4 w-4 text-green-500" />
    default:
      return <File className="h-4 w-4" />
  }
}

function getStatusIcon(status: FileAttachment['status']) {
  switch (status) {
    case 'uploading':
    case 'processing':
      return <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
    case 'error':
      return <AlertCircle className="h-3 w-3 text-destructive" />
    default:
      return null
  }
}

export function FilePreview({
  file,
  onRemove,
  showContent = false,
  className,
}: FilePreviewProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const hasContent = file.content && file.status === 'ready'
  const canExpand = showContent && hasContent

  return (
    <div
      className={cn(
        'group relative bg-muted/50 border rounded-lg overflow-hidden',
        file.status === 'error' && 'border-destructive/50 bg-destructive/5',
        className
      )}
    >
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="flex items-center gap-2 p-2">
          {/* File icon */}
          <div className="shrink-0">
            {getFileIcon(file.fileType)}
          </div>

          {/* File info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(file.size)}
              {file.language && ` · ${file.language}`}
              {file.pageCount && ` · ${file.pageCount} pages`}
            </p>
          </div>

          {/* Status indicator */}
          <div className="shrink-0">
            {getStatusIcon(file.status)}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {canExpand && (
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  {isExpanded ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </Button>
              </CollapsibleTrigger>
            )}

            {file.url && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                asChild
              >
                <a href={file.url} download={file.name}>
                  <Download className="h-3 w-3" />
                </a>
              </Button>
            )}

            {onRemove && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={onRemove}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Error message */}
        {file.status === 'error' && file.error && (
          <div className="px-2 pb-2">
            <p className="text-xs text-destructive">{file.error}</p>
          </div>
        )}

        {/* Upload progress */}
        {file.status === 'uploading' && file.uploadProgress !== undefined && (
          <div className="px-2 pb-2">
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${file.uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Expandable content */}
        {canExpand && (
          <CollapsibleContent>
            <div className="border-t max-h-64 overflow-auto">
              {file.fileType === 'code' && file.language ? (
                <CodeBlock
                  code={file.content!}
                  language={file.language}
                />
              ) : (
                <pre className="p-3 text-xs text-muted-foreground whitespace-pre-wrap font-mono">
                  {file.content}
                </pre>
              )}
            </div>
          </CollapsibleContent>
        )}
      </Collapsible>
    </div>
  )
}

// List of file previews
interface FilePreviewListProps {
  files: FileAttachment[]
  onRemove?: (id: string) => void
  showContent?: boolean
  className?: string
}

export function FilePreviewList({
  files,
  onRemove,
  showContent = false,
  className,
}: FilePreviewListProps) {
  if (files.length === 0) return null

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {files.map((file) => (
        <FilePreview
          key={file.id}
          file={file}
          onRemove={onRemove ? () => onRemove(file.id) : undefined}
          showContent={showContent}
          className="w-full sm:w-auto sm:min-w-[200px] sm:max-w-[300px]"
        />
      ))}
    </div>
  )
}

// Compact file badge for inline display
interface FileBadgeProps {
  file: FileAttachment
  onClick?: () => void
  className?: string
}

export function FileBadge({ file, onClick, className }: FileBadgeProps) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-md',
        'bg-muted/50 hover:bg-muted text-sm',
        'transition-colors cursor-pointer',
        file.status === 'error' && 'bg-destructive/10 text-destructive',
        className
      )}
      onClick={onClick}
    >
      {getFileIcon(file.fileType)}
      <span className="max-w-[150px] truncate">{file.name}</span>
      {file.status === 'error' && (
        <AlertCircle className="h-3 w-3 text-destructive" />
      )}
    </button>
  )
}

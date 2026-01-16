import type { FileType, FileAttachment } from '@/types/chat'
import { getFileType, getLanguage } from './types'

/**
 * Result of processing a file
 */
export interface ProcessedFile {
  content: string
  pageCount?: number
  language?: string
  truncated?: boolean
}

/**
 * Read a text file and return its content
 */
export async function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

/**
 * Read a file as base64 data URL
 */
export async function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

/**
 * Read a file as ArrayBuffer
 */
export async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsArrayBuffer(file)
  })
}

/**
 * Truncate content if it exceeds max length
 */
function truncateContent(content: string, maxLength: number = 100000): { content: string; truncated: boolean } {
  if (content.length <= maxLength) {
    return { content, truncated: false }
  }

  // Try to truncate at a natural break point
  const truncated = content.slice(0, maxLength)
  const lastNewline = truncated.lastIndexOf('\n')
  const breakPoint = lastNewline > maxLength * 0.8 ? lastNewline : maxLength

  return {
    content: truncated.slice(0, breakPoint) + '\n\n[Content truncated...]',
    truncated: true,
  }
}

/**
 * Process a text or code file
 */
async function processTextFile(file: File): Promise<ProcessedFile> {
  const content = await readTextFile(file)
  const { content: processedContent, truncated } = truncateContent(content)
  const language = getLanguage(file.name)

  return {
    content: processedContent,
    language,
    truncated,
  }
}

/**
 * Process a PDF file (client-side extraction)
 * Note: For full PDF support, pdf-parse or similar would be used server-side
 */
async function processPDFFile(file: File): Promise<ProcessedFile> {
  // Client-side PDF text extraction is limited
  // Return a placeholder indicating server-side processing is needed
  return {
    content: `[PDF file: ${file.name}]\n\nThis PDF requires server-side processing for text extraction.`,
    pageCount: undefined, // Would be extracted server-side
    truncated: false,
  }
}

/**
 * Process a document file (DOC/DOCX)
 */
async function processDocumentFile(file: File): Promise<ProcessedFile> {
  // Document files require server-side processing
  return {
    content: `[Document file: ${file.name}]\n\nThis document requires server-side processing for text extraction.`,
    truncated: false,
  }
}

/**
 * Process a file and extract its content
 */
export async function processFile(file: File): Promise<ProcessedFile> {
  const fileType = getFileType(file.name, file.type)

  switch (fileType) {
    case 'text':
    case 'code':
      return processTextFile(file)
    case 'pdf':
      return processPDFFile(file)
    case 'document':
      return processDocumentFile(file)
    case 'image':
      // Images are handled separately
      return {
        content: `[Image file: ${file.name}]`,
        truncated: false,
      }
    default:
      return {
        content: `[File: ${file.name}]`,
        truncated: false,
      }
  }
}

/**
 * Generate a unique file ID
 */
export function generateFileId(): string {
  return `file_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Create a FileAttachment from a File object
 */
export async function createFileAttachment(
  file: File,
  processContent: boolean = true
): Promise<FileAttachment> {
  const fileType = getFileType(file.name, file.type)
  const language = getLanguage(file.name)

  const attachment: FileAttachment = {
    id: generateFileId(),
    type: 'file',
    name: file.name,
    mimeType: file.type || 'application/octet-stream',
    size: file.size,
    url: URL.createObjectURL(file),
    fileType,
    status: 'processing',
    language,
  }

  if (processContent && (fileType === 'text' || fileType === 'code')) {
    try {
      const processed = await processFile(file)
      attachment.content = processed.content
      attachment.status = 'ready'
    } catch (error) {
      attachment.status = 'error'
      attachment.error = error instanceof Error ? error.message : 'Failed to process file'
    }
  } else {
    attachment.status = 'ready'
  }

  return attachment
}

/**
 * Format file content for AI context
 */
export function formatFileForContext(attachment: FileAttachment): string {
  const header = `--- File: ${attachment.name} ---`
  const language = attachment.language ? ` (${attachment.language})` : ''

  if (attachment.content) {
    if (attachment.fileType === 'code') {
      return `${header}${language}\n\`\`\`${attachment.language || ''}\n${attachment.content}\n\`\`\`\n`
    }
    return `${header}\n${attachment.content}\n`
  }

  return `${header}\n[File content not available]\n`
}

/**
 * Format multiple file attachments for AI context
 */
export function formatFilesForContext(attachments: FileAttachment[]): string {
  if (attachments.length === 0) return ''

  const fileContents = attachments
    .filter(a => a.status === 'ready')
    .map(formatFileForContext)
    .join('\n')

  if (!fileContents) return ''

  return `\n\n=== Attached Files ===\n${fileContents}=== End Attached Files ===\n`
}

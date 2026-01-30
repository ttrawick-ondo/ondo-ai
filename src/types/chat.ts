import type { ToolCall, ToolExecutionRecord } from './tools'

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool'

export interface Attachment {
  id: string
  type: 'file' | 'image' | 'code'
  name: string
  url: string
  mimeType: string
  size: number
}

// Image-specific attachment
export interface ImageAttachment extends Attachment {
  type: 'image'
  width?: number
  height?: number
  base64?: string // For API transmission
  detail?: 'auto' | 'low' | 'high' // For OpenAI vision
  altText?: string
}

// File-specific attachment
export type FileType = 'pdf' | 'document' | 'code' | 'text' | 'image'
export type FileStatus = 'uploading' | 'processing' | 'ready' | 'error'

export interface FileAttachment extends Attachment {
  type: 'file'
  fileType: FileType
  status: FileStatus
  content?: string // Extracted text content for text/code files
  error?: string
  uploadProgress?: number // 0-100
  pageCount?: number // For PDFs
  language?: string // For code files
}

// Check if an attachment is a file
export function isFileAttachment(attachment: Attachment): attachment is FileAttachment {
  return attachment.type === 'file'
}

// Content part for vision messages (multi-modal)
export type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string; detail?: 'auto' | 'low' | 'high' } }

// Image content for API
export interface ImageContent {
  type: 'image_url'
  image_url: {
    url: string // base64 or URL
    detail?: 'auto' | 'low' | 'high'
  }
}

// Check if an attachment is an image
export function isImageAttachment(attachment: Attachment): attachment is ImageAttachment {
  return attachment.type === 'image'
}

export interface MessageMetadata {
  model?: string
  tokenCount?: number
  processingTimeMs?: number
  promptId?: string
  // Routing metadata
  routing?: {
    intent?: string
    confidence?: number
    wasAutoRouted?: boolean
    routedBy?: string
  }
}

export interface Message {
  id: string
  conversationId: string
  role: MessageRole
  content: string
  attachments?: Attachment[]
  metadata?: MessageMetadata
  createdAt: Date
  updatedAt?: Date
  // Tool-related fields
  tool_calls?: ToolCall[]
  tool_call_id?: string
  tool_executions?: ToolExecutionRecord[]
  // Citation-related fields (for Glean responses)
  citations?: Citation[]
}

export interface Conversation {
  id: string
  title: string
  projectId?: string
  workspaceId?: string
  userId: string
  modelId?: string
  messageCount: number
  lastMessageAt: Date
  createdAt: Date
  updatedAt: Date
}

export interface CreateConversationInput {
  title?: string
  projectId?: string
  workspaceId?: string
}

export interface SendMessageInput {
  content: string
  attachments?: Omit<Attachment, 'id'>[]
  promptId?: string
  modelId?: string
  // Tool-related options
  tools?: string[] // Tool names to enable
  tool_choice?: 'auto' | 'none' | 'required' | { type: 'function'; function: { name: string } }
}

// Citation Types (for Glean responses)
export type CitationSourceType = 'confluence' | 'slack' | 'github' | 'jira' | 'gdrive' | 'notion' | 'custom'

export interface CitationSource {
  type: CitationSourceType
  title: string
  url: string
  author?: string
  date?: string
  icon?: string
}

export interface Citation {
  id: string
  number: number // Display number [1], [2], etc.
  text: string // The cited text
  source: CitationSource
  relevanceScore?: number
  snippet: string
}

export interface MessageCitations {
  messageId: string
  citations: Citation[]
  parsedContent: string // Content with citation markers
}

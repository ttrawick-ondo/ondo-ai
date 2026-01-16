export type MessageRole = 'user' | 'assistant' | 'system'

export interface Attachment {
  id: string
  type: 'file' | 'image' | 'code'
  name: string
  url: string
  mimeType: string
  size: number
}

export interface MessageMetadata {
  model?: string
  tokenCount?: number
  processingTimeMs?: number
  promptId?: string
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
}

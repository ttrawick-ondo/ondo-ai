/**
 * Glean API Types
 * Type definitions for Glean Search and Chat APIs
 */

// Search Request/Response Types
export interface GleanSearchRequest {
  query: string
  pageSize?: number
  cursor?: string
  requestOptions?: {
    facetFilters?: GleanFacetFilter[]
    timeRange?: {
      start: string
      end: string
    }
    datasourceFilter?: string
  }
}

export interface GleanFacetFilter {
  fieldName: string
  values: string[]
}

export interface GleanSearchResponse {
  results: GleanSearchResult[]
  facetResults?: GleanFacetResult[]
  cursor?: string
  hasMoreResults: boolean
  totalResultCount?: number
}

export interface GleanSearchResult {
  document: GleanDocument
  snippets: GleanSnippet[]
  score: number
}

export interface GleanDocument {
  id: string
  title: string
  url: string
  datasource: string
  docType?: string
  author?: GleanPerson
  updatedAt?: string
  createdAt?: string
  containerName?: string
}

export interface GleanSnippet {
  snippet: string
  mimeType: string
}

export interface GleanPerson {
  name: string
  email?: string
  avatarUrl?: string
}

export interface GleanFacetResult {
  sourceName: string
  buckets: Array<{
    value: string
    count: number
  }>
}

// Citation Types
export interface GleanCitation {
  id: string
  title: string
  url: string
  snippet: string
  sourceType: GleanSourceType
  author?: string
  updatedAt?: string
  datasource: string
}

export type GleanSourceType =
  | 'confluence'
  | 'gdrive'
  | 'slack'
  | 'github'
  | 'notion'
  | 'jira'
  | 'sharepoint'
  | 'custom'

// Chat Types (extends provider types)
export interface GleanChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface GleanChatRequest {
  messages: GleanChatMessage[]
  agentId?: string
  stream?: boolean
  retrievalConfig?: {
    dataSources?: string[]
  }
}

export interface GleanChatResponse {
  id: string
  message: {
    role: 'assistant'
    content: string
  }
  citations?: GleanCitation[]
}

// Search Tool Types
export interface GleanSearchToolInput {
  query: string
  datasource?: string
  maxResults?: number
}

export interface GleanSearchToolResult {
  results: Array<{
    title: string
    url: string
    snippet: string
    source: string
    author?: string
    updatedAt?: string
  }>
  totalCount: number
}

// Service Types
export interface GleanServiceConfig {
  apiKey?: string
  apiUrl?: string
}

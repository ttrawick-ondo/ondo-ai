# Feature: Glean Enterprise Search Integration

## Overview
Implement real Glean API integration for enterprise knowledge search with citations.

## Requirements

### 1. Glean API Client (`src/lib/api/providers/glean/`)
- Implement real Glean Search API calls
- Support chat completions with citations
- Handle authentication with API key
- Parse and display Glean citations properly

### 2. Search Tool
- Real `glean_search` tool for function calling
- Search across company knowledge base
- Return results with source citations
- Filter by data source, date, author

### 3. Citation Enhancement
- Display citations inline in responses
- Show source previews on hover
- Link to original documents
- Citation count badge on messages

### 4. Chat Mode
- "Glean Chat" mode using Glean's assistant API
- Maintains conversation context
- Returns citations with every response
- Supports follow-up questions

### 5. Data Source Browser
- List available Glean data sources
- Filter agents by data source access
- Show data source icons and descriptions

## Technical Details

```typescript
// Glean Search Request
interface GleanSearchRequest {
  query: string
  pageSize?: number
  requestOptions?: {
    facetFilters?: FacetFilter[]
    timeRange?: { start: string; end: string }
  }
}

// Glean Chat Request (real API)
interface GleanChatRequest {
  messages: Array<{ role: string; content: string }>
  agentConfig?: {
    agent: string
    mode: string
  }
  retrievalConfig?: {
    dataSources?: string[]
  }
}

// Citation with source info
interface GleanCitation {
  id: string
  title: string
  url: string
  snippet: string
  sourceType: 'confluence' | 'gdrive' | 'slack' | 'github' | 'notion' | string
  author?: string
  updatedAt?: string
}
```

## Files to Modify
- `src/lib/api/providers/glean.ts` - Add real API implementation
- `src/lib/tools/builtin/` - Add glean_search tool

## Files to Create
- `src/lib/api/glean/search.ts`
- `src/lib/api/glean/chat.ts`
- `src/lib/api/glean/types.ts`
- `src/lib/tools/builtin/glean-search.ts`
- `src/components/chat/GleanCitation.tsx`

## Environment Variables
```
GLEAN_API_KEY=your-api-key
GLEAN_API_URL=https://your-company.glean.com/api/v1
```

## Testing
- Mock Glean API responses for unit tests
- Integration tests with real API (when available)
- E2E test for search flow with citations

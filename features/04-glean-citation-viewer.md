# Feature: Glean Citation Viewer

## Overview
Display Glean citations in a rich, interactive format showing source documents, relevance, and quick preview capabilities.

## Requirements

### 1. Type Definitions
Add to `src/types/chat.ts`:
- `Citation` - Citation with source metadata
- `CitationSource` - Source document info
- `CitationPreview` - Preview content

```typescript
interface Citation {
  id: string
  text: string
  source: CitationSource
  relevanceScore?: number
  snippet: string
}

interface CitationSource {
  type: 'confluence' | 'slack' | 'github' | 'jira' | 'drive' | 'notion' | 'custom'
  title: string
  url: string
  author?: string
  date?: string
  icon?: string
}
```

### 2. Citation Inline Component
Create `src/components/chat/CitationInline.tsx`:
- Superscript citation number [1]
- Hover tooltip with source preview
- Click to open full citation panel
- Color-coded by source type

### 3. Citation Panel Component
Create `src/components/chat/CitationPanel.tsx`:
- Slide-out panel or modal
- Full citation details
- Source document preview
- "Open in source" button
- Copy citation button
- Related citations section

### 4. Citations List Component
Create `src/components/chat/CitationsList.tsx`:
- Collapsible footer below AI message
- Grouped by source type
- Relevance indicators
- Quick expand/collapse all
- "Show more" for many citations

### 5. Message Bubble Updates
Modify `src/components/chat/MessageBubble.tsx`:
- Parse citation markers from Glean responses
- Render CitationInline components
- Show CitationsList footer when citations exist
- Handle citation numbering

### 6. Citation Parser Utility
Create `src/lib/utils/citationParser.ts`:
- Parse Glean response for citations
- Extract citation markers [1], [2], etc.
- Map markers to citation objects
- Handle malformed citations

### 7. Source Type Icons
Create `src/components/chat/SourceTypeIcon.tsx`:
- Icons for each data source type
- Consistent sizing and colors
- Fallback for unknown types

### 8. Chat Store Updates
Modify `src/stores/chatStore.ts`:
- Store citations per message
- Track expanded citation state
- Handle citation metadata

## Acceptance Criteria
- [ ] Citations display as clickable superscripts
- [ ] Hover shows source preview
- [ ] Click opens full citation details
- [ ] Citations grouped by source type
- [ ] Can open source document in new tab
- [ ] Works with all Glean data source types
- [ ] Graceful handling of missing citations
- [ ] Accessible keyboard navigation

## UI Design
```
┌────────────────────────────────────────────┐
│ According to the documentation [1], the    │
│ process involves three steps [2]...        │
├────────────────────────────────────────────┤
│ 📚 Sources (2)                          ▼  │
│ ┌─────────────────────────────────────────┐│
│ │ 📄 Confluence: Setup Guide             ││
│ │    "The installation process..."       ││
│ └─────────────────────────────────────────┘│
│ ┌─────────────────────────────────────────┐│
│ │ 💬 Slack: #engineering                 ││
│ │    "Follow these three steps..."       ││
│ └─────────────────────────────────────────┘│
└────────────────────────────────────────────┘
```

## Technical Notes
- Use Radix UI Popover for hover previews
- Implement lazy loading for citation details
- Consider caching citation previews
- Handle long citation lists with virtualization

# Ondo AI - Component Documentation

## Layout Components

### MainLayout
**Path**: `src/components/layout/MainLayout.tsx`

Root layout wrapper for the main application.

```typescript
<MainLayout>
  {children}
</MainLayout>
```

Includes:
- Sidebar (navigation, workspace selector, conversations)
- Header (search, theme toggle, user menu)
- Main content area

### Sidebar
**Path**: `src/components/layout/Sidebar/`

Collapsible sidebar with:
- **SidebarHeader**: Logo and new chat button
- **WorkspaceSelector**: Switch between workspaces
- **SidebarNav**: Main navigation links
- **ConversationList**: Recent conversations

Toggle with `⌘B` keyboard shortcut.

### Header
**Path**: `src/components/layout/Header/`

Top navigation bar with:
- Menu toggle button
- Search command button (`⌘K`)
- Theme toggle
- User menu dropdown

## Chat Components

### ChatContainer
**Path**: `src/components/chat/ChatContainer.tsx`

Main chat interface wrapper.

```typescript
<ChatContainer conversationId="conv-123" />
```

Manages:
- Message list scrolling
- Streaming state display
- Input area positioning

### MessageBubble
**Path**: `src/components/chat/MessageBubble.tsx`

Individual message display.

```typescript
<MessageBubble
  message={message}
  isStreaming={false}
/>
```

Features:
- User/AI styling
- Copy button
- Regenerate button (AI only)
- Markdown rendering

### ChatInput
**Path**: `src/components/chat/ChatInput.tsx`

Message input area.

Features:
- Auto-resize textarea
- Attachment button (placeholder)
- Prompt selector button (placeholder)
- Send button with loading state
- Enter to send (configurable)

### CodeBlock
**Path**: `src/components/chat/CodeBlock.tsx`

Syntax-highlighted code display.

```typescript
<CodeBlock
  language="typescript"
  code={codeString}
/>
```

Features:
- Syntax highlighting (Prism)
- Language badge
- Copy button
- Line numbers

### MarkdownRenderer
**Path**: `src/components/chat/MarkdownRenderer.tsx`

Rich markdown rendering with:
- Code blocks → CodeBlock component
- Tables
- Lists
- Links
- Headings
- Blockquotes

## UI Components

All shadcn/ui components are in `src/components/ui/`:

| Component | Description |
|-----------|-------------|
| Button | Primary action button with variants |
| Input | Text input field |
| Textarea | Multi-line text input |
| Avatar | User/AI avatar with fallback |
| Badge | Status/category labels |
| Card | Container component |
| Dialog | Modal dialogs |
| DropdownMenu | Context menus |
| ScrollArea | Custom scrollbars |
| Select | Dropdown selection |
| Tabs | Tabbed interface |
| Tooltip | Hover hints |
| Command | Command palette |
| Sheet | Mobile slide-out panels |

## Creating New Components

### Template

```typescript
'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

interface MyComponentProps {
  /** Description of prop */
  title: string
  /** Optional prop with default */
  variant?: 'default' | 'secondary'
  /** Event handler */
  onAction?: () => void
}

export function MyComponent({
  title,
  variant = 'default',
  onAction,
}: MyComponentProps) {
  const [isActive, setIsActive] = useState(false)

  return (
    <div
      className={cn(
        'base-styles',
        variant === 'secondary' && 'secondary-styles',
        isActive && 'active-styles'
      )}
    >
      {title}
    </div>
  )
}
```

### Exports

Create `index.ts` in component folders:

```typescript
// src/components/feature/index.ts
export { FeatureList } from './FeatureList'
export { FeatureCard } from './FeatureCard'
export { FeatureForm } from './FeatureForm'
```

Import from folder:

```typescript
import { FeatureList, FeatureCard } from '@/components/feature'
```

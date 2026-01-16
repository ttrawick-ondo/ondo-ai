# Ondo AI - Architecture Documentation

## Overview

Ondo AI is a company-wide AI assistant chat application built with:
- **Next.js 14+** (App Router)
- **Tailwind CSS** + **shadcn/ui**
- **Zustand** for state management
- **TypeScript** (strict mode)

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth route group (login, signup)
│   ├── (main)/            # Main app with sidebar layout
│   │   ├── chat/          # Chat interface
│   │   ├── projects/      # Project management
│   │   ├── prompts/       # Prompt library
│   │   └── settings/      # User settings
│   └── layout.tsx         # Root layout
│
├── components/
│   ├── ui/                # shadcn/ui primitives
│   ├── layout/            # Layout components (Sidebar, Header)
│   ├── chat/              # Chat feature components
│   ├── projects/          # Project components
│   ├── prompts/           # Prompt library components
│   └── shared/            # Reusable components
│
├── stores/                # Zustand stores
│   ├── chatStore.ts       # Conversations, messages, streaming
│   ├── projectStore.ts    # Project CRUD
│   ├── workspaceStore.ts  # Workspaces, members
│   ├── promptStore.ts     # Prompts, categories
│   ├── uiStore.ts         # UI state (sidebar, modals)
│   └── userStore.ts       # User, preferences
│
├── types/                 # TypeScript interfaces
├── hooks/                 # Custom React hooks
├── lib/
│   ├── utils.ts           # Utility functions
│   ├── api/               # API client layer
│   └── mocks/             # Mock data
├── config/                # App configuration
└── providers/             # React context providers
```

## Data Flow

```
User Action → Component → Store Action → (API Call) → State Update → Re-render
```

### Example: Sending a Message

1. User types in `ChatInput` and clicks send
2. `ChatInput` calls `chatStore.actions.sendMessage()`
3. Store adds user message to state
4. Store simulates AI streaming response
5. Store updates with final AI message
6. `MessageList` re-renders with new messages

## Key Architecture Decisions

### 1. Feature-Based Organization

Components are organized by feature (chat, projects, prompts) rather than by type (buttons, forms). This keeps related code together and makes features easier to find.

### 2. Store-First State

All data mutations go through Zustand stores. Components never directly modify data - they call store actions. This provides:
- Single source of truth
- Easy debugging with devtools
- Predictable state updates

### 3. Selector Hooks

Each store exports selector hooks for optimized re-renders:

```typescript
// Only re-renders when activeConversation changes
const conversation = useActiveConversation()

// Only re-renders when messages for this ID change
const messages = useMessages(conversationId)
```

### 4. API Abstraction Layer

The `/lib/api/` folder provides an abstraction for backend calls:

```typescript
// Easy to swap mock → real implementation
const apiClient = process.env.NEXT_PUBLIC_USE_MOCK_API
  ? new MockApiClient()
  : new HttpApiClient(baseUrl)
```

### 5. Route Groups

App Router route groups organize layouts:
- `(auth)` - Minimal auth pages layout
- `(main)` - Full app with sidebar/header

## Backend Integration

When ready to connect a real backend:

1. Create `HttpApiClient` in `/lib/api/client.ts`
2. Update environment variables
3. Replace mock stores with API calls
4. Add error handling and loading states

The store actions are already structured to make this transition smooth.

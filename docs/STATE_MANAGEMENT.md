# Ondo AI - State Management

## Overview

State is managed with Zustand, organized into feature-specific stores. Each store follows a consistent pattern with separate state and actions.

## Stores

### chatStore
**Path**: `src/stores/chatStore.ts`

Manages conversations and messages.

**State**:
```typescript
{
  conversations: Record<string, Conversation>
  activeConversationId: string | null
  messagesByConversation: Record<string, Message[]>
  isStreaming: boolean
  streamingMessage: string
  isLoading: boolean
}
```

**Selector Hooks**:
```typescript
useActiveConversation()    // Current conversation
useConversations()         // All conversations array
useMessages(id)            // Messages for conversation
useIsStreaming()           // Streaming state
useStreamingMessage()      // Current streaming content
useChatActions()           // Action functions
```

**Actions**:
- `createConversation(title?, projectId?)` - Create new conversation
- `setActiveConversation(id)` - Switch conversation
- `sendMessage(input)` - Send user message, trigger AI response
- `deleteConversation(id)` - Remove conversation
- `clearConversation(id)` - Clear messages

### projectStore
**Path**: `src/stores/projectStore.ts`

Manages projects for organizing conversations.

**State**:
```typescript
{
  projects: Record<string, Project>
  activeProjectId: string | null
  isLoading: boolean
}
```

**Selector Hooks**:
```typescript
useProjects()              // All projects
useActiveProject()         // Current project
useProjectById(id)         // Single project
useProjectsByWorkspace(id) // Workspace projects
useProjectActions()        // Action functions
```

**Actions**:
- `createProject(input)` - Create project
- `updateProject(id, input)` - Update project
- `deleteProject(id)` - Remove project
- `setActiveProject(id)` - Set active project

### workspaceStore
**Path**: `src/stores/workspaceStore.ts`

Manages workspaces and team members.

**State**:
```typescript
{
  workspaces: Record<string, Workspace>
  activeWorkspaceId: string | null
  membersByWorkspace: Record<string, WorkspaceMember[]>
  isLoading: boolean
}
```

**Selector Hooks**:
```typescript
useWorkspaces()            // All workspaces
useActiveWorkspace()       // Current workspace
useWorkspaceById(id)       // Single workspace
useWorkspaceMembers(id)    // Workspace members
useWorkspaceActions()      // Action functions
```

**Actions**:
- `createWorkspace(input)` - Create workspace
- `setActiveWorkspace(id)` - Switch workspace
- `inviteMember(workspaceId, email, role)` - Invite user
- `updateMemberRole(workspaceId, memberId, role)` - Change role
- `removeMember(workspaceId, memberId)` - Remove member

### promptStore
**Path**: `src/stores/promptStore.ts`

Manages prompt templates.

**State**:
```typescript
{
  prompts: Record<string, Prompt>
  categories: PromptCategory[]
  activeCategoryId: string | null
  searchQuery: string
  isLoading: boolean
}
```

**Selector Hooks**:
```typescript
usePrompts()               // All prompts
usePromptById(id)          // Single prompt
usePromptCategories()      // Categories
useFavoritePrompts()       // Favorited prompts
useFilteredPrompts()       // Filtered by category/search
usePromptActions()         // Action functions
```

**Actions**:
- `createPrompt(input)` - Create prompt
- `updatePrompt(id, input)` - Update prompt
- `deletePrompt(id)` - Remove prompt
- `duplicatePrompt(id)` - Copy prompt
- `toggleFavorite(id)` - Toggle favorite
- `incrementUsage(id)` - Track usage

### uiStore
**Path**: `src/stores/uiStore.ts`

Manages UI state.

**State**:
```typescript
{
  sidebarOpen: boolean
  sidebarWidth: number
  activeModal: ModalType | null
  modalProps: Record<string, unknown>
  commandPaletteOpen: boolean
  mobileNavOpen: boolean
}
```

**Selector Hooks**:
```typescript
useSidebarOpen()           // Sidebar visibility
useSidebarWidth()          // Sidebar width
useActiveModal()           // Current modal
useCommandPaletteOpen()    // Command palette state
useUIActions()             // Action functions
```

**Persisted**: sidebar state

### userStore
**Path**: `src/stores/userStore.ts`

Manages current user and preferences.

**State**:
```typescript
{
  currentUser: User | null
  isAuthenticated: boolean
  preferences: UserPreferences
}
```

**Selector Hooks**:
```typescript
useCurrentUser()           // Current user
useIsAuthenticated()       // Auth state
useUserPreferences()       // Preferences
useUserActions()           // Action functions
```

**Persisted**: user preferences

## Best Practices

### 1. Use Selector Hooks

Always use selector hooks instead of selecting from full store:

```typescript
// ✅ Good - Only re-renders when activeConversation changes
const conversation = useActiveConversation()

// ❌ Bad - Re-renders on any store change
const store = useChatStore()
const conversation = store.conversations[store.activeConversationId]
```

### 2. Keep Actions in Stores

Business logic belongs in store actions, not components:

```typescript
// ✅ Good
const { sendMessage } = useChatActions()
sendMessage({ content })

// ❌ Bad - Logic in component
const store = useChatStore()
store.setState({ ... })
```

### 3. Derive Data with Selectors

Compute derived data in selectors:

```typescript
// In store
export const useFilteredPrompts = () =>
  usePromptStore((state) => {
    let prompts = Object.values(state.prompts)
    if (state.activeCategoryId) {
      prompts = prompts.filter(p => p.categoryId === state.activeCategoryId)
    }
    return prompts
  })
```

### 4. Batch Updates

Group related state changes:

```typescript
set((state) => ({
  conversations: { ...state.conversations, [id]: newConv },
  activeConversationId: id,
  messagesByConversation: { ...state.messagesByConversation, [id]: [] },
}))
```

## Adding New Stores

1. Create store file in `/stores/`
2. Define state and actions interfaces
3. Create store with devtools/persist middleware
4. Export selector hooks
5. Add to `/stores/index.ts`

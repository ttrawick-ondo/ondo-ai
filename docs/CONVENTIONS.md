# Ondo AI - Code Conventions

This document outlines conventions for maintaining a clean, consistent codebase as we iterate and add features.

## File Naming

- **Components**: PascalCase (`ChatInput.tsx`, `MessageBubble.tsx`)
- **Hooks**: camelCase with `use` prefix (`useChat.ts`, `useDebounce.ts`)
- **Stores**: camelCase with `Store` suffix (`chatStore.ts`, `uiStore.ts`)
- **Types**: camelCase (`chat.ts`, `workspace.ts`)
- **Utilities**: camelCase (`utils.ts`, `formatters.ts`)

## Component Guidelines

### Structure

```typescript
'use client' // Only if needed

import { ... } from 'react'
import { ... } from 'next/navigation'
import { ... } from '@/components/ui'
import { ... } from '@/stores'
import { ... } from '@/lib/utils'

interface ComponentProps {
  // Props interface
}

export function Component({ prop1, prop2 }: ComponentProps) {
  // Hooks first
  const [state, setState] = useState()
  const storeData = useStoreSelector()

  // Event handlers
  const handleClick = () => { ... }

  // Render
  return (...)
}
```

### Do's

- ✅ Keep components focused on one responsibility
- ✅ Extract reusable logic into hooks
- ✅ Use TypeScript interfaces for props
- ✅ Colocate related files (component, test, stories)
- ✅ Use barrel exports (`index.ts`)

### Don'ts

- ❌ Put business logic in components (use stores)
- ❌ Create deeply nested component hierarchies
- ❌ Use inline styles except for dynamic values
- ❌ Import from parent directories (`../../`)

## State Management

### When to Use What

| State Type | Use |
|------------|-----|
| Zustand Store | Shared data, persisted state, complex state logic |
| useState | Local UI state (open/closed, form inputs) |
| URL params | Filter state, pagination, IDs |

### Store Conventions

```typescript
// 1. State interface
interface StoreState {
  data: Record<string, Item>
  isLoading: boolean
}

// 2. Actions interface
interface StoreActions {
  fetchData: () => Promise<void>
  createItem: (input: CreateInput) => Item
}

// 3. Combined type
type Store = StoreState & { actions: StoreActions }

// 4. Export selector hooks
export const useItems = () => useStore(s => Object.values(s.data))
export const useStoreActions = () => useStore(s => s.actions)
```

## Styling

### Tailwind Classes

- Use `cn()` utility for conditional classes
- Keep classes readable - break to new lines if long
- Prefer Tailwind utilities over custom CSS

```typescript
<div className={cn(
  'flex items-center gap-2 rounded-lg p-4',
  isActive && 'bg-primary text-primary-foreground',
  isDisabled && 'opacity-50 pointer-events-none'
)}>
```

### shadcn/ui Components

- Import from `@/components/ui`
- Don't modify base components - extend them
- Follow variant patterns for new components

## Adding Features

### Checklist for New Feature

1. **Types** - Add TypeScript interfaces in `/types/`
2. **Store** - Create or update Zustand store
3. **Components** - Create in feature folder
4. **Routes** - Add pages in `/app/(main)/`
5. **Navigation** - Update sidebar if needed

### File Placement

```
New feature "analytics":

src/
├── types/analytics.ts           # Types
├── stores/analyticsStore.ts     # State
├── components/analytics/        # Components
│   ├── AnalyticsDashboard.tsx
│   ├── ChartWidget.tsx
│   └── index.ts
└── app/(main)/analytics/        # Routes
    └── page.tsx
```

## Cleanup Guidelines

When revising features, follow this checklist:

### Before Making Changes

- [ ] Understand the current implementation
- [ ] Check for usages of code you're changing
- [ ] Review the store to understand state shape

### After Making Changes

- [ ] Remove unused imports
- [ ] Remove unused variables and functions
- [ ] Update TypeScript types if data shape changed
- [ ] Update store selectors if state shape changed
- [ ] Test all affected routes
- [ ] Check for console errors/warnings

### Code to Remove

- Unused components/files
- Commented-out code (delete, don't comment)
- Console.log statements
- Dead code paths
- Duplicate logic (extract to shared)

## Testing (Future)

When adding tests:

```
ComponentName/
├── ComponentName.tsx
├── ComponentName.test.tsx
└── index.ts
```

## Documentation

- Add JSDoc to complex functions
- Update this file if conventions change
- Keep README.md updated with setup instructions

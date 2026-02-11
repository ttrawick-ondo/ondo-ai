# Architecture Roadmap

This document tracks architectural improvements needed before production deployment.

---

## Priority 1: Authentication & Authorization

**Status:** Blocked on Okta app setup

### Current State
- No auth middleware
- API routes assume trusted caller
- Global API keys exposed to any frontend caller
- No rate limiting

### Target State
- Okta SSO via NextAuth
- Middleware protecting all `/api/*` and app routes
- User context passed to all API handlers
- Rate limiting per user/workspace

### Files to Create/Modify
```
src/middleware.ts                    # Auth middleware
src/lib/auth/config.ts               # NextAuth configuration
src/app/api/auth/[...nextauth]/      # NextAuth route handler
```

---

## Priority 2: Server-Rendered Layouts

**Status:** Not started

### Current State
- `(main)/layout.tsx` renders entire app via client-only `MainLayout`
- All routes hydrate a huge React tree
- No server-side data gating possible
- Sidebar data fetched client-side

### Problem
```tsx
// Current: Everything is client-rendered
export default function MainLayout({ children }) {
  return <ClientMainLayout>{children}</ClientMainLayout>  // 🔴 Client boundary too high
}
```

### Target State
```tsx
// Target: Server layout with client islands
export default async function MainLayout({ children }) {
  const session = await getServerSession()        // Server-side auth check
  const workspaces = await getWorkspaces(session) // Server-side data fetch

  return (
    <div className="flex">
      <Sidebar workspaces={workspaces} />         // Can be server component
      <main>{children}</main>
    </div>
  )
}
```

### Benefits
- Faster initial page load (less JS to hydrate)
- Server-side auth gating before any render
- Cleaner data flow (props instead of useEffect)
- Better SEO if needed

### Migration Steps
1. Audit which components truly need `'use client'`
2. Extract client interactivity into smaller islands
3. Move data fetching to server components/layouts
4. Remove client-side auth checks in favor of middleware

---

## Priority 3: Centralized Data Fetching

**Status:** Partially started (APIs exist, stores not using React Query)

### Current State
| Data Source | Fetching Method | Cache | Invalidation |
|-------------|-----------------|-------|--------------|
| Conversations | Zustand + API | localStorage | Manual |
| Workspaces | Zustand + API | None | Manual |
| Prompts | Zustand + API | localStorage (favorites) | Manual |
| Messages | Zustand | Memory | On navigation |

### Problems
- Hydration mismatches (localStorage vs server)
- Stale data after mutations in other tabs
- No automatic refetching
- Manual cache invalidation is error-prone

### Target State
Option A: **React Query / TanStack Query**
```tsx
// Consistent pattern for all data fetching
const { data: workspaces, isLoading } = useQuery({
  queryKey: ['workspaces', userId],
  queryFn: () => workspaceApi.getUserWorkspaces(userId),
})

// Mutations automatically invalidate related queries
const mutation = useMutation({
  mutationFn: workspaceApi.createWorkspace,
  onSuccess: () => queryClient.invalidateQueries(['workspaces']),
})
```

Option B: **Server Components + Streaming**
```tsx
// Fetch in server component, no client cache needed
export default async function WorkspacesPage() {
  const workspaces = await getWorkspaces()  // Direct DB call
  return <WorkspaceList workspaces={workspaces} />
}
```

### Migration Steps
1. Install `@tanstack/react-query`
2. Create query hooks in `src/lib/queries/`
3. Migrate stores one at a time (workspaces → prompts → conversations)
4. Remove Zustand persistence for server-fetched data
5. Keep Zustand only for ephemeral UI state (modals, selections)

---

## Priority 4: Split chatStore Responsibilities

**Status:** Not started

### Current State
`chatStore.ts` handles:
- Conversation CRUD
- Message management
- Streaming state
- Tool execution
- API orchestration
- Optimistic updates
- Persistence

**1100+ lines in one file**

### Problems
- Single failure (e.g., tool parsing) breaks entire chat flow
- Hard to test individual concerns
- Difficult to migrate to server actions later

### Target Architecture
```
src/
├── stores/
│   └── chatStore.ts              # UI state only (activeConversation, isStreaming)
├── services/
│   ├── conversation.service.ts   # CRUD operations
│   ├── message.service.ts        # Message operations
│   └── tool.service.ts           # Tool execution
├── lib/
│   └── streaming/
│       ├── chat-stream.ts        # SSE handling
│       └── stream-parser.ts      # Delta parsing
└── queries/
    ├── useConversations.ts       # React Query hook
    └── useMessages.ts            # React Query hook
```

### Migration Steps
1. Extract tool execution into `src/services/tool.service.ts`
2. Extract streaming logic into `src/lib/streaming/`
3. Move API calls to React Query mutations
4. Reduce chatStore to UI state only

---

## Priority 5: Isolate Provider Integrations

**Status:** Not started

### Current State
```
src/lib/api/providers/
├── openai.ts       # Direct SDK usage
├── anthropic.ts    # Direct SDK usage
├── glean.ts        # Direct API calls
└── index.ts        # Exports all providers
```

These sit in `src/lib/` alongside client utilities, risking:
- Provider SDK code bundled into client
- API keys accessible if tree-shaking fails
- No clear server-only boundary

### Target Architecture
Option A: **Server-only package**
```
packages/
└── ai-providers/           # Separate package, server-only
    ├── package.json        # { "type": "module", "exports": { "." : "./dist/index.js" } }
    ├── src/
    │   ├── openai.ts
    │   ├── anthropic.ts
    │   └── glean.ts
    └── tsconfig.json       # Target: node
```

Option B: **Next.js server-only directive**
```tsx
// src/lib/api/providers/openai.ts
import 'server-only'  // Throws build error if imported from client

import OpenAI from 'openai'
// ...
```

Option C: **Edge/API route isolation**
- Keep providers only in API routes
- Never import from components
- Use `next.config.js` to enforce

### Recommended: Option B (simplest)
Add `import 'server-only'` to all provider files as an immediate fix.

---

## Priority 6: API Security Layer

**Status:** Not started

### Current State
```
Frontend → /api/chat → OpenAI (with global API key)
```

No:
- Rate limiting
- Request validation
- Audit logging
- Cost tracking per user

### Target State
```
Frontend → Middleware (auth) → /api/chat → Rate Limiter → Provider
                                    ↓
                              Audit Log + Usage Tracking
```

### Implementation
```typescript
// src/middleware.ts
export async function middleware(request: NextRequest) {
  // 1. Auth check
  const session = await getToken({ req: request })
  if (!session) return NextResponse.redirect('/login')

  // 2. Rate limiting (using Upstash Redis or similar)
  const { success } = await ratelimit.limit(session.user.id)
  if (!success) return NextResponse.json({ error: 'Rate limited' }, { status: 429 })

  // 3. Add user context to headers
  const response = NextResponse.next()
  response.headers.set('x-user-id', session.user.id)
  return response
}

export const config = {
  matcher: ['/api/:path*', '/chat/:path*', '/projects/:path*']
}
```

---

## Implementation Order

| Phase | Items | Depends On |
|-------|-------|------------|
| **Phase 1** | Okta SSO + Middleware | Okta app from IT |
| **Phase 2** | Server-only providers (`import 'server-only'`) | Nothing |
| **Phase 3** | Rate limiting + audit logging | Phase 1 |
| **Phase 4** | React Query migration | Nothing (can parallelize) |
| **Phase 5** | Split chatStore | Phase 4 |
| **Phase 6** | Server-rendered layouts | Phase 1, 4 |

---

## Quick Wins (No Dependencies)

These can be done immediately:

1. **Add `server-only` to provider files**
   ```bash
   npm install server-only
   ```
   Then add `import 'server-only'` to each provider file.

2. **Add request validation to API routes**
   Use Zod schemas to validate all incoming requests.

3. **Add error boundaries around chat**
   Prevent tool execution errors from crashing the entire UI.

4. **Extract tool execution from chatStore**
   Move to separate service file for isolation.

---

## Tracking

- [ ] Phase 1: Auth middleware
- [ ] Phase 2: Server-only providers
- [ ] Phase 3: Rate limiting
- [ ] Phase 4: React Query migration
- [ ] Phase 5: Split chatStore
- [ ] Phase 6: Server layouts

Last updated: 2026-02-11

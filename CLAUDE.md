# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev              # Start Next.js dev server
npm run build            # Production build
npm run lint             # ESLint

# Testing
npm run test             # Unit tests (Vitest) - watch mode
npm run test:run         # Unit tests - single run
npm run test:coverage    # Unit tests with coverage
npm run test:e2e         # E2E tests (Playwright)
npm run test:e2e:headed  # E2E tests with browser UI
npm run test:smoke       # Smoke tests only

# Validation
npm run validate         # Build + smoke tests (use before commits)

# Agent CLI (autonomous coding agents)
npm run agent:build      # Build agent package first
npm run agent test --target <file>           # Generate tests for a file
npm run agent feature --spec "description"   # Implement a feature
npm run agent feature --spec-file <file>     # Implement from spec file
npm run agent refactor --scope <path>        # Refactor code
npm run agent qa                             # Run QA checks
npm run agent qa --pre-commit                # Pre-commit validation

# Agent flags
--auto-approve (-a)      # Skip approval prompts (for test/qa tasks)
--verbose (-v)           # Show agent thinking and tool calls
--dry-run                # Preview without changes
```

## Architecture

### Tech Stack
- **Next.js 14** with App Router, TypeScript, Tailwind CSS, shadcn/ui
- **Zustand** for state management
- **Multi-provider AI**: OpenAI, Anthropic, Glean, Dust, OndoBot

### Project Structure
```
src/
├── app/                 # Next.js App Router (pages, API routes)
│   └── api/
│       ├── chat/        # Main chat endpoint with routing
│       └── actions/     # External system action endpoints
├── components/          # React components by feature (chat/, projects/, prompts/, ui/)
├── stores/              # Zustand stores (chatStore, projectStore, routingStore, etc.)
├── lib/
│   ├── api/
│   │   ├── providers/   # AI provider implementations (openai.ts, anthropic.ts, glean.ts)
│   │   ├── routing/     # Intent classification & request routing
│   │   ├── config/      # Model configs, capabilities, pricing
│   │   ├── streaming/   # SSE encoder/decoder
│   │   └── client.ts    # Frontend API clients
│   └── tools/           # Function calling tools (builtin/, registry.ts)
└── types/               # TypeScript interfaces
packages/
└── agent/               # Autonomous agent CLI (see Agent System below)
```

### Data Flow Pattern
```
Component → Store Action → API Client → /api/chat → Router → Provider → AI Response
                                                       ↓            ↓
Component ← Store Update ← Stream Callbacks ← SSE Stream ←──────────┘
```

### Intelligent Routing System
The app includes an intent-based routing system that can automatically select the optimal provider for each request.

**Request Intents:**
- `knowledge_query` → Glean (search + RAG)
- `code_task` → Claude (Anthropic)
- `data_analysis` → GPT-4 (OpenAI)
- `action_request` → Action endpoints
- `general_chat` → Default provider

**Key Files:**
```
src/lib/api/routing/
├── classifier.ts       # Rule-based intent classification
├── index.ts            # Main routing entry point (getRouteForRequest)
└── knowledge-router.ts # Glean RAG handler
src/stores/routingStore.ts  # User preferences (persisted)
src/components/chat/RoutingIndicator.tsx  # UI indicator
```

**Usage:**
```typescript
import { getRouteForRequest } from '@/lib/api/routing'

const route = await getRouteForRequest(chatRequest, {
  autoRouting: true,
  confidenceThreshold: 0.7,
  providerPreferences: { knowledge_query: 'glean', code_task: 'anthropic' },
})
// route: { model, provider, intent, confidence, wasAutoRouted }
```

Routing info flows through response headers (`X-Intent`, `X-Routed-By`, `X-Intent-Confidence`) and is displayed via `RoutingIndicator` component when enabled in settings.

### Provider Pattern
All AI providers extend `BaseProvider` with:
- `complete(request)` - Non-streaming response
- `stream(request)` - Returns `AsyncGenerator<StreamEvent>`
- Singleton caching via `getProviderForModel(modelId)`

### Tool System
Tools are registered in `src/lib/tools/builtin/` and use the pattern:
```typescript
export const myTool = createTool(
  'tool_name',
  'description',
  { type: 'object', properties: {...}, required: [...] },  // JSON Schema
  async (args): Promise<ToolResult> => { ... }
)
```
Tools must be added to `builtinTools` array in `builtin/index.ts`.

### State Management
Zustand stores export selector hooks for optimized re-renders:
```typescript
// Good: only re-renders when this conversation's messages change
const messages = useMessages(conversationId)

// Avoid: re-renders on any store change
const store = useChatStore()
```

## Agent System

The `packages/agent/` contains autonomous coding agents that can implement features, write tests, and refactor code.

### Configuration
Agents use `.ondo-agent.json` at project root:
```json
{
  "defaults": { "model": "claude-sonnet-4-20250514", "maxIterations": 10 },
  "autonomy": {
    "taskTypes": {
      "test": "full",      // Auto-approve all actions
      "qa": "full",
      "feature": "supervised",  // Requires approval
      "refactor": "supervised"
    }
  }
}
```

### Agent Types
| Command | Purpose | Autonomy |
|---------|---------|----------|
| `agent test` | Generate/fix tests | Full (auto) |
| `agent qa` | Type check, lint, test | Full (auto) |
| `agent feature` | Implement features | Supervised |
| `agent refactor` | Code improvements | Supervised |

### Invoking Agents Programmatically
```typescript
import { Orchestrator, loadConfig } from '@ondo-ai/agent'

const config = await loadConfig(process.cwd())
const orchestrator = new Orchestrator({ config, workingDirectory: process.cwd() })

// For auto-approve (test/qa tasks)
orchestrator.setApprovalHandler(createAutoApproveHandler())

const task = orchestrator.createTask({
  type: 'feature',
  title: 'Add dark mode',
  description: 'Implement dark mode toggle...',
})

const result = await orchestrator.runTask(task.id)
// result: { success, summary, changes, toolsUsed, iterations }
```

## Environment Variables

```bash
# Required for providers
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Optional providers
GLEAN_API_KEY=glean-...
GLEAN_API_URL=https://api.glean.com/v1

# Feature flags (default: true)
ENABLE_OPENAI=true
ENABLE_ANTHROPIC=true
ENABLE_GLEAN=false

# Routing configuration
ROUTING_MODE=rule_based              # or 'llm_hybrid' (future)
ROUTING_CONFIDENCE_THRESHOLD=0.7     # Min confidence for auto-routing
ENABLE_AUTO_ROUTING=false            # Opt-in for auto-routing
```

## Key Patterns

### Adding a New AI Tool
1. Create `src/lib/tools/builtin/my-tool.ts` using `createTool()`
2. Add to exports in `src/lib/tools/builtin/index.ts`
3. Add to `builtinTools` array
4. Create API route if tool needs server-side execution

### Adding a New Provider
1. Create `src/lib/api/providers/myprovider.ts` extending `BaseProvider`
2. Add model configs to `src/lib/api/config/providers.ts`
3. Register in `src/lib/api/providers/index.ts`
4. Add env vars to `.env` and type to `AIProvider`

### Store Actions
Store actions go in the `actions` object within the store:
```typescript
const useMyStore = create((set, get) => ({
  items: [],
  actions: {
    addItem: (item) => set((state) => ({ items: [...state.items, item] })),
  },
}))
```

### Action Endpoints
External system actions are dispatched through `/api/actions/`:
```
src/app/api/actions/
├── route.ts           # Main dispatcher (validates auth, routes to handlers)
└── ondobot/route.ts   # OndoBot-specific actions
```

The `execute_action` tool (`src/lib/tools/builtin/execute-action.ts`) allows AI to trigger actions:
```typescript
// Available systems: ondobot, hubspot (future), jira (future), slack (future)
// OndoBot actions: chat, run_automation, query_data, get_status, list_automations
```

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
├── components/          # React components by feature (chat/, projects/, prompts/, ui/)
├── stores/              # Zustand stores (chatStore, projectStore, modelStore, etc.)
├── lib/
│   ├── api/
│   │   ├── providers/   # AI provider implementations (openai.ts, anthropic.ts, glean.ts)
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
Component → Store Action → API Client → /api/chat → Provider → AI Response
                                                          ↓
Component ← Store Update ← Stream Callbacks ← SSE Stream ←┘
```

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

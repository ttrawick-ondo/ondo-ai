# Ondo-AI Knowledge System Strategy

## Current State & Context

### What We Have Today
Ondo-AI is a **multi-provider AI chat interface** that already supports:

```
┌─────────────────────────────────────────────────────────────┐
│                    ONDO-AI (Current)                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Unified Chat Interface                               │  │
│  │  • Conversation management                            │  │
│  │  • Prompt templates                                   │  │
│  │  • Project organization                               │  │
│  └──────────────────────────────────────────────────────┘  │
│                          │                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Provider Layer (BaseProvider pattern)                │  │
│  ├──────────┬──────────┬──────────┬──────────┬─────────┤  │
│  │  OpenAI  │ Anthropic│  Glean   │   Dust   │ OndoBot │  │
│  │  (GPT-4) │ (Claude) │  (RAG)   │  (RAG)   │  (API)  │  │
│  └──────────┴──────────┴──────────┴──────────┴─────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Tool System (Function Calling)                       │  │
│  │  • Web search                                         │  │
│  │  • (Extensible via createTool pattern)               │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Agent System (packages/agent/)                       │  │
│  │  • Feature implementation                             │  │
│  │  • Test generation                                    │  │
│  │  • Code refactoring                                   │  │
│  │  • QA automation                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### The Ask
> "Build something like Glean where we can ingest connectors from Notion, GDocs, Slack, etc."

### The Reality
- **Available resources**: 1-2 engineers
- **Risk**: Building a poor imitation that costs more in engineering time than licensing would have

---

## The Honest Comparison

### What Glean Actually Costs to Build

| Component | Glean Has | DIY Effort (1-2 engineers) |
|-----------|-----------|---------------------------|
| 100+ connectors | ✅ Built over 5 years | 6-12 months for 5-10 connectors |
| Unified search ranking | ✅ ML team, years of tuning | Basic ranking, 2-3 months |
| Knowledge graph | ✅ Entity resolution, relationships | Not feasible with 1-2 engineers |
| Sub-100ms latency | ✅ Massive infrastructure | ~500ms realistic |
| Enterprise permissions | ✅ Row-level, real-time | Basic role filtering, 1-2 months |
| SOC2/compliance | ✅ Certified | $50-100K + 6 months |
| Ongoing maintenance | ✅ Dedicated team | 30-50% of your engineers' time |

**Glean's team**: ~500 employees, $200M+ funding, 5+ years of development

### The Real Trade-off

```
┌────────────────────────────────────────────────────────────────┐
│                    BUILD vs BUY REALITY                         │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  GLEAN/DUST ($300-600K/year)                                  │
│  ├─ Works in 2 weeks                                          │
│  ├─ 100+ connectors                                           │
│  ├─ Enterprise-grade search                                   │
│  ├─ Compliance included                                       │
│  ├─ Zero engineering maintenance                              │
│  └─ Predictable cost                                          │
│                                                                │
│  DIY (1-2 engineers)                                          │
│  ├─ $200-400K/year in salary alone                           │
│  ├─ 6-12 months before anything useful                        │
│  ├─ 5-10 connectors max (and they'll break)                  │
│  ├─ Basic search quality                                      │
│  ├─ No compliance                                             │
│  ├─ Ongoing maintenance burden                                │
│  └─ Opportunity cost: what else could those engineers build?  │
│                                                                │
│  HYBRID (Recommended)                                          │
│  ├─ Use Ondo-AI as the unified interface (already built)     │
│  ├─ Glean/Dust for enterprise search (if budget allows)      │
│  ├─ OR Onyx for search (self-hosted, lower cost)             │
│  ├─ MCPs for write operations (create tickets, post messages)│
│  └─ 1-2 engineers focused on integration, not infrastructure │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## Strategic Options

### Option A: Glean/Dust + Ondo-AI Integration
**Best for**: Organizations where $300-600K/year is acceptable

```
┌─────────────────────────────────────────────────────────────┐
│                    OPTION A: PREMIUM                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Ondo-AI (Your Interface)                             │  │
│  │  • Multi-model chat (GPT-4, Claude, etc.)            │  │
│  │  • Custom agents                                      │  │
│  │  • Prompt templates                                   │  │
│  │  • Project management                                 │  │
│  └────────────────────────┬─────────────────────────────┘  │
│                           │                                 │
│  ┌────────────────────────┴─────────────────────────────┐  │
│  │  Tool Layer                                           │  │
│  ├─────────────────────────┬────────────────────────────┤  │
│  │  Glean/Dust API         │  MCP Servers               │  │
│  │  (Search)               │  (Write Operations)        │  │
│  │  • "Find docs about X"  │  • Create Jira ticket      │  │
│  │  • "Who knows about Y"  │  • Post to Slack           │  │
│  │  • "Recent updates on Z"│  • Update Notion page      │  │
│  └─────────────────────────┴────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Effort**: 2-4 weeks (integration only)
**Cost**: $300-600K/year (Glean) + minimal engineering
**What you get**: Best-in-class search + your custom interface + write capabilities

**Why this might actually be cheaper**:
- 2 engineers × $200K = $400K/year in salary
- They'd spend 12+ months building something worse
- Opportunity cost: what features could they build instead?

---

### Option B: Onyx + MCP + Ondo-AI
**Best for**: Organizations that can't justify Glean pricing but have engineering capacity

```
┌─────────────────────────────────────────────────────────────┐
│                    OPTION B: BALANCED                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Ondo-AI (Your Interface)                             │  │
│  │  • Multi-model chat                                   │  │
│  │  • Custom agents                                      │  │
│  │  • Unified experience                                 │  │
│  └────────────────────────┬─────────────────────────────┘  │
│                           │                                 │
│  ┌────────────────────────┴─────────────────────────────┐  │
│  │  Tool Layer                                           │  │
│  ├─────────────────────────┬────────────────────────────┤  │
│  │  Onyx (Self-Hosted)     │  MCP Servers               │  │
│  │  (Search)               │  (Write Operations)        │  │
│  │  • 40+ connectors       │  • Notion                  │  │
│  │  • Semantic + keyword   │  • Slack                   │  │
│  │  • Permission filtering │  • Jira                    │  │
│  └─────────────────────────┴────────────────────────────┘  │
│                           │                                 │
│  ┌────────────────────────┴─────────────────────────────┐  │
│  │  Infrastructure                                       │  │
│  │  • Onyx on Docker/K8s ($500-2K/month)                │  │
│  │  • Vector DB (included in Onyx)                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Effort**: 2-3 months
**Cost**: $50-100K first year (setup + infra), $20-40K/year ongoing
**What you get**: 80% of Glean's search + full write capability + full control

**Trade-offs**:
- Search quality won't match Glean
- You own the maintenance
- No enterprise compliance out-of-box

---

### Option C: MCP-Heavy with Lightweight Indexing
**Best for**: Smaller teams (<50 people) where real-time is acceptable

```
┌─────────────────────────────────────────────────────────────┐
│                    OPTION C: LIGHTWEIGHT                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Ondo-AI (Your Interface)                             │  │
│  └────────────────────────┬─────────────────────────────┘  │
│                           │                                 │
│  ┌────────────────────────┴─────────────────────────────┐  │
│  │  MCP Hub (All Operations)                             │  │
│  ├──────────┬──────────┬──────────┬──────────┬─────────┤  │
│  │  Notion  │  Slack   │  GDrive  │  GitHub  │  Jira   │  │
│  │  R + W   │  R + W   │  R + W   │  R + W   │  R + W  │  │
│  └──────────┴──────────┴──────────┴──────────┴─────────┘  │
│                           │                                 │
│  ┌────────────────────────┴─────────────────────────────┐  │
│  │  Optional: pgvector for "favorites" or recent docs    │  │
│  │  (Simple semantic search over most-used content)      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Effort**: 4-6 weeks
**Cost**: $10-30K (mostly engineering time)
**What you get**: Full read/write to all tools, basic search, fast to ship

**Trade-offs**:
- Slow searches (federated, not indexed)
- No unified ranking
- No semantic search (unless you add pgvector layer)
- Best for agent use cases, not human search

---

### Option D: Phased Approach
**Best for**: Uncertain requirements, limited resources, sensitive to Glean pricing

```
Phase 1: Prove Value (4-6 weeks, 1 engineer)
──────────────────────────────────────────────
• Add MCP tools to Ondo-AI for top 3-4 services
• Notion: read pages, create pages
• Slack: search messages, post messages
• Jira: search issues, create tickets
• GitHub: search code, create PRs

Deliverable: Agents can search and act across tools
Cost: ~$20K (engineering time)


Phase 2: Evaluate Search Options (2-4 weeks)
──────────────────────────────────────────────
• Run Onyx POC with real data
• Compare search quality to Glean trial
• Measure: latency, relevance, coverage

Decision point: Is 80% of Glean good enough?


Phase 3a: If Onyx is sufficient (1-2 months)
──────────────────────────────────────────────
• Deploy Onyx to production
• Integrate search into Ondo-AI tools
• Keep MCPs for write operations

Total cost: $50-80K Year 1


Phase 3b: If Glean quality is required
──────────────────────────────────────────────
• Present data to leadership: "Onyx gets us 80%,
  Glean gets us 100%, here's what that means"
• Negotiate Glean contract with data
• Keep MCPs for write operations (Glean doesn't do this)

Total cost: $300-600K/year (but justified with data)
```

---

### Option E: Glean as Primary Interface (No Custom UI)
**Best for**: Organizations willing to pay for Glean and wanting to minimize engineering effort

**The Idea**: Instead of building Ondo-AI as a custom frontend that calls Glean, make Glean THE interface. Build custom Glean agents that call OndoBot and other internal APIs.

```
┌─────────────────────────────────────────────────────────────┐
│              OPTION E: GLEAN-FIRST                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Glean (Primary Interface)                            │  │
│  │  • Enterprise search across all sources              │  │
│  │  • Knowledge graph & entity resolution               │  │
│  │  • Built-in chat UI                                  │  │
│  │  • Permissions & compliance                          │  │
│  └────────────────────────┬─────────────────────────────┘  │
│                           │                                 │
│  ┌────────────────────────┴─────────────────────────────┐  │
│  │  Custom Glean Agents (you build these)               │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │                                                      │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐     │  │
│  │  │ OndoBot    │  │ Internal   │  │ Custom     │     │  │
│  │  │ Agent      │  │ Tools      │  │ Workflows  │     │  │
│  │  │            │  │ Agent      │  │ Agent      │     │  │
│  │  │ • Employee │  │ • HubSpot  │  │ • Onboard  │     │  │
│  │  │   lookup   │  │   (write)  │  │   new hire │     │  │
│  │  │ • Policies │  │ • Fathom   │  │ • Expense  │     │  │
│  │  │ • Benefits │  │   (query)  │  │   approval │     │  │
│  │  │ • IT help  │  │ • Custom   │  │ • PTO      │     │  │
│  │  │            │  │   APIs     │  │   request  │     │  │
│  │  └────────────┘  └────────────┘  └────────────┘     │  │
│  │                                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                           │                                 │
│  ┌────────────────────────┴─────────────────────────────┐  │
│  │  Backend Services (existing)                          │  │
│  ├──────────┬──────────┬──────────┬──────────┬─────────┤  │
│  │ OndoBot  │ HubSpot  │ Fathom   │ Internal │ Custom  │  │
│  │  API     │   API    │   API    │   DBs    │  APIs   │  │
│  └──────────┴──────────┴──────────┴──────────┴─────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**What You Build**:
1. **Glean Agent definitions** - JSON/YAML configs that define agent behavior
2. **API endpoints** for Glean to call (thin wrappers around existing services)
3. **Action handlers** for write operations Glean can't do natively

**What You Don't Build**:
- ❌ Chat UI
- ❌ Search infrastructure
- ❌ Authentication/SSO
- ❌ Permissions system
- ❌ Multi-model routing
- ❌ Conversation management

**Effort**: 2-4 weeks (agent definitions + API endpoints)
**Cost**: $300-600K/year (Glean) + minimal engineering
**What you get**: Enterprise-grade everything + custom internal tools

### Glean Agent Architecture

Glean supports custom agents via their [Assistant API](https://developers.glean.com/docs/assistant_api/):

```typescript
// Example: OndoBot Agent Definition
{
  "name": "OndoBot Assistant",
  "description": "Ask questions about company policies, benefits, IT, and employee info",
  "instructions": "You help employees find information about company policies...",
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "search_ondobot",
        "description": "Search OndoBot knowledge base",
        "parameters": {
          "type": "object",
          "properties": {
            "query": { "type": "string" }
          }
        }
      }
    },
    {
      "type": "function",
      "function": {
        "name": "get_employee",
        "description": "Get employee details by email",
        "parameters": {
          "type": "object",
          "properties": {
            "email": { "type": "string" }
          }
        }
      }
    },
    {
      "type": "function",
      "function": {
        "name": "submit_it_ticket",
        "description": "Create an IT support ticket",
        "parameters": {
          "type": "object",
          "properties": {
            "title": { "type": "string" },
            "description": { "type": "string" },
            "priority": { "enum": ["low", "medium", "high"] }
          }
        }
      }
    }
  ]
}
```

```typescript
// Backend: API endpoint for Glean to call
// src/app/api/glean-actions/ondobot/route.ts

export async function POST(req: Request) {
  const { action, parameters } = await req.json()

  switch (action) {
    case 'search_ondobot':
      return Response.json(await ondoBotAPI.search(parameters.query))

    case 'get_employee':
      return Response.json(await ondoBotAPI.getEmployee(parameters.email))

    case 'submit_it_ticket':
      return Response.json(await jiraAPI.createTicket({
        project: 'IT',
        ...parameters
      }))
  }
}
```

### Comparison: Option A vs Option E

| Aspect | Option A (Ondo-AI + Glean) | Option E (Glean Only) |
|--------|---------------------------|----------------------|
| **Primary UI** | Ondo-AI (custom) | Glean |
| **Engineering effort** | Medium (maintain UI + integration) | Low (agents + APIs only) |
| **Model flexibility** | Full (GPT-4, Claude, etc.) | Glean's models only |
| **Customization** | High (your UI, your rules) | Limited to Glean's UX |
| **User training** | New interface to learn | Uses existing Glean |
| **Maintenance** | UI + integrations | Agents + APIs only |
| **Unique capabilities** | Custom workflows, multi-model | Unified search + agents |

### When to Choose Option E

**Choose Option E if:**
- ✅ You're already paying for Glean (or will be)
- ✅ Users are already comfortable with Glean
- ✅ You don't need multi-model flexibility
- ✅ You want minimal engineering investment
- ✅ Custom UI isn't a differentiator for your use case

**Choose Option A instead if:**
- ❌ You need to use specific models (Claude, GPT-4, etc.)
- ❌ You want full control over the UX
- ❌ You have unique workflow requirements
- ❌ Multi-provider routing is important

### What Happens to Ondo-AI?

If you go with Option E, Ondo-AI becomes:

1. **Agent backend** - API endpoints that Glean agents call
2. **Internal tool** - For dev/admin use cases where Glean isn't appropriate
3. **Deprecated** - If Glean covers all use cases

**Realistic path**:
- Keep Ondo-AI for internal/dev use
- Build new features as Glean agents first
- Evaluate in 6 months whether Ondo-AI adds value

---

## In-House MCP Development

### What's Realistic with 1-2 Engineers

**Can Build (4-6 weeks each)**:
- Custom MCP server for internal APIs
- MCP wrappers for services without official MCPs
- Integration layer in Ondo-AI for MCP tools

**Example: Custom OndoBot MCP**:
```typescript
// packages/mcp-ondobot/src/index.ts
import { MCPServer } from '@anthropic/mcp-sdk'

const server = new MCPServer({
  name: 'ondobot',
  version: '1.0.0',
})

server.addTool({
  name: 'search_internal_docs',
  description: 'Search OndoBot internal documentation',
  parameters: {
    query: { type: 'string', description: 'Search query' },
  },
  handler: async ({ query }) => {
    const results = await ondoBotAPI.search(query)
    return { results }
  },
})

server.addTool({
  name: 'get_employee_info',
  description: 'Get information about an employee',
  parameters: {
    email: { type: 'string', description: 'Employee email' },
  },
  handler: async ({ email }) => {
    return ondoBotAPI.getEmployee(email)
  },
})
```

**Cannot Realistically Build**:
- Production-grade connectors for 10+ services (too much maintenance)
- High-quality unified search ranking (needs ML expertise)
- Real-time permission sync across all sources
- Sub-100ms query latency at scale

### MCP Integration in Ondo-AI

```typescript
// src/lib/tools/mcp/index.ts
import { MCPClient } from '@anthropic/mcp-sdk'

// Registry of MCP servers
const mcpServers = {
  notion: new MCPClient({ endpoint: 'mcp://notion' }),
  slack: new MCPClient({ endpoint: 'mcp://slack' }),
  jira: new MCPClient({ endpoint: 'mcp://jira' }),
  ondobot: new MCPClient({ endpoint: 'mcp://ondobot' }),
}

// Convert MCP tools to Ondo-AI tool format
export async function loadMCPTools(): Promise<Tool[]> {
  const tools: Tool[] = []

  for (const [name, client] of Object.entries(mcpServers)) {
    const mcpTools = await client.listTools()
    for (const mcpTool of mcpTools) {
      tools.push(createTool(
        `${name}_${mcpTool.name}`,
        mcpTool.description,
        mcpTool.parameters,
        async (args) => client.callTool(mcpTool.name, args)
      ))
    }
  }

  return tools
}
```

---

## MCP CRUD Capabilities (Researched January 2026)

### Summary Table

| Service | Create | Read | Update | Delete | Official? | Notes |
|---------|--------|------|--------|--------|-----------|-------|
| **Google Drive/Docs** | ✅ | ✅ | ✅ | ✅ | ✅ Official | Full CRUD, Sheets/Slides support |
| **Notion** | ✅ | ✅ | ✅ | ❌ | ✅ Official | Deletes intentionally blocked |
| **Slack** | ✅ | ✅ | ✅ | ⚠️ | ✅ Official | Full messaging, canvas support |
| **HubSpot** | ❌ | ✅ | ❌ | ❌ | ✅ Official (Beta) | Read-only CRM objects |
| **Fathom AI** | ⚠️ | ✅ | ❌ | ❌ | ❌ Community | Read meetings/transcripts, create webhooks |
| **Jira** | ✅ | ✅ | ✅ | ⚠️ | ✅ Atlassian | Full issue management |
| **GitHub** | ✅ | ✅ | ✅ | ⚠️ | ✅ Official | PRs, issues, code search |

### Google Drive / Google Docs

**Official Support**: Google announced [official MCP support](https://cloud.google.com/blog/products/ai-machine-learning/announcing-official-mcp-support-for-google-services) (December 2025) with enterprise-ready endpoints.

**Capabilities**:
- ✅ **Create**: Files, folders, Docs, Sheets, Slides
- ✅ **Read**: Search, list, get content from any file type
- ✅ **Update**: Edit Docs, update Sheets cells, modify Slides
- ✅ **Delete**: Remove files and folders
- ✅ **Shared Drives**: Full access to Team Drives

**Best Server**: [piotr-agier/google-drive-mcp](https://github.com/piotr-agier/google-drive-mcp) - comprehensive multi-format support

**Auth**: Google OAuth 2.0 credentials (JSON file)

---

### Notion

**Official Support**: [Notion MCP](https://developers.notion.com/docs/mcp) - hosted by Notion at `mcp.notion.com/mcp`

**Capabilities**:
- ✅ **Create**: Pages, database entries
- ✅ **Read**: Search pages, get content, list databases, read comments
- ✅ **Update**: Modify page content, update database entries
- ❌ **Delete**: Intentionally disabled for safety

**Key Details**:
- Acts with your full Notion permissions
- Real-time access to pages, databases, comments
- Works with Claude, ChatGPT, Cursor out of box

**Auth**: Notion OAuth (managed by Notion's hosted server)

**Note**: "The official Notion MCP server is designed with safety in mind – it doesn't expose destructive operations (e.g., deleting pages or databases is not allowed via MCP)."

---

### Slack

**Official Support**: [Slack MCP Server](https://docs.slack.dev/ai/mcp-server/) - rolling out to partners, broadly available summer 2025

**Capabilities**:
- ✅ **Create**: Post messages, create canvases, schedule messages
- ✅ **Read**: Search channels, read messages, get user profiles, workspace info
- ✅ **Update**: Edit messages, update canvases
- ⚠️ **Delete**: Limited (can delete own messages)

**Key Features**:
- Rich data grounding from conversational history
- Canvas integration (read/write)
- Enterprise admin controls
- OAuth authentication respecting existing permissions

**Community Alternative**: [korotovsky/slack-mcp-server](https://github.com/korotovsky/slack-mcp-server) - works in "stealth mode" without requiring additional permissions, supports DMs/Group DMs

**Auth**: Slack OAuth or Bot Token

---

### HubSpot

**Official Support**: [HubSpot MCP Server](https://developers.hubspot.com/mcp) (Public Beta)

**Capabilities**:
- ❌ **Create**: Not available yet
- ✅ **Read**: Contacts, companies, deals, tickets, products, orders, invoices, quotes
- ❌ **Update**: Not available yet
- ❌ **Delete**: Not available

**Two Server Types**:
1. **Remote MCP Server**: Read-only CRM object access
2. **Developer MCP Server**: Interact with HubSpot Developer Platform via CLI

**Roadmap**: OAuth 2.1 support planned for later 2025

**Community Alternative**: [peakmojo/mcp-hubspot](https://github.com/peakmojo/mcp-hubspot) - adds vector storage and caching to overcome API limitations

**Auth**: HubSpot Private App Access Token

**Limitation**: Currently read-only. For write operations, you'd need to use HubSpot's REST API directly or wait for MCP updates.

---

### Fathom AI (Meeting Intelligence)

**Official Support**: None - community servers only

**Available Servers**:
- [Dot-Fun/fathom-mcp](https://github.com/Dot-Fun/fathom-mcp) - most feature-complete
- [druellan/Fathom-Simple-MCP](https://github.com/druellan/Fathom-Simple-MCP) - optimized for efficiency
- [sourcegate/mcp-fathom-server](https://github.com/sourcegate/mcp-fathom-server) - natural language search

**Capabilities**:
- ⚠️ **Create**: Webhooks only (for meeting notifications)
- ✅ **Read**: List meetings, get summaries, get transcripts with timestamps/speakers, team info
- ❌ **Update**: Not available
- ❌ **Delete**: Not available

**Key Features**:
- Filter meetings by participants, date ranges, teams
- Full transcript access with speaker identification
- Smart search across titles, summaries, transcripts, action items

**Auth**: Fathom API Key (`FATHOM_API_KEY` env var)

**Use Case**: Great for "What did we discuss in last week's standup?" or "Find all meetings with [person] about [topic]"

---

### Implications for Ondo-AI

**High-Value MCP Integrations** (Full CRUD):
1. **Google Drive/Docs** - Full document management
2. **Notion** - Full workspace management (except delete)
3. **Slack** - Full messaging and collaboration

**Limited but Useful** (Read-heavy):
4. **HubSpot** - CRM queries (read-only for now)
5. **Fathom AI** - Meeting intelligence (read-only)

**For Write Operations to HubSpot/Fathom**:
- Build thin API wrappers as custom MCP servers
- Or use direct REST API calls as Ondo-AI tools

---

## Recommendation Matrix

| Your Situation | Recommended Path |
|----------------|------------------|
| Budget exists, need it fast | **Option A**: Glean + Ondo-AI + MCPs |
| Budget exists, minimize eng effort | **Option E**: Glean as primary UI, custom agents |
| Budget tight, have patience | **Option B**: Onyx + Ondo-AI + MCPs |
| Uncertain requirements | **Option D**: Phased approach with decision points |
| Just need agent tools | **Option C**: MCP-only, skip search infrastructure |

### Option Comparison

| Option | Glean Cost | Eng Effort | Custom UI | Search Quality | Write Ops |
|--------|------------|------------|-----------|----------------|-----------|
| **A**: Glean + Ondo-AI | $300-600K | Medium | ✅ Full | Excellent | ✅ MCPs |
| **B**: Onyx + Ondo-AI | $0 | High | ✅ Full | Good (80%) | ✅ MCPs |
| **C**: MCP-only | $0 | Low | ✅ Full | Basic | ✅ MCPs |
| **D**: Phased | TBD | Medium | ✅ Full | TBD | ✅ MCPs |
| **E**: Glean-first | $300-600K | **Low** | ❌ Glean's | Excellent | ✅ Agents |

---

## Summary

### What Makes Sense for Ondo-AI

Given:
- Existing multi-provider architecture
- 1-2 engineers available
- Expanding scope expectations

**The Key Question**: Is a custom UI a differentiator, or is it just engineering overhead?

**If custom UI matters** (multi-model, specific workflows):
1. Add MCP tools to existing agent framework (Phase 1)
2. Evaluate Onyx vs Glean with real data (Phase 2)
3. Make data-driven build/buy decision (Phase 3)

**If custom UI doesn't matter** (just need search + internal tools):
1. Commit to Glean as the primary interface (Option E)
2. Build Glean agents that call OndoBot and internal APIs
3. Repurpose Ondo-AI engineers to build agent backends

**The honest assessment**:
- Ondo-AI's current value: multi-model chat + prompt templates
- Glean's value: enterprise search + knowledge graph + compliance
- If you're paying $300-600K/year for Glean anyway, why maintain a separate UI?

**Do**:
1. Decide if custom UI is worth the engineering investment
2. If yes → Option A or B
3. If no → Option E (Glean-first)

**Don't**:
1. Try to build Glean from scratch
2. Maintain two chat interfaces (Ondo-AI + Glean)
3. Let scope creep turn 4 weeks into 12 months

---

## Appendix: Cost Comparison

| Item | Option E (Glean-first) | Option A (Glean + Ondo-AI) | Option B (Onyx) | Full DIY |
|------|------------------------|---------------------------|-----------------|----------|
| Software license | $300-600K/yr | $300-600K/yr | $0 | $0 |
| Infrastructure | Included | Included + Ondo-AI hosting | $20-40K/yr | $30-50K/yr |
| Engineering (setup) | 2-4 weeks | 4-6 weeks | 2-3 months | 12+ months |
| Engineering (maintain) | 10% of 1 FTE | 30% of 1 FTE | 20% of 1 FTE | 50%+ of 2 FTEs |
| Custom UI | ❌ Use Glean | ✅ Ondo-AI | ✅ Ondo-AI | ✅ Custom |
| Search quality | Excellent | Excellent | Good | Basic-Good |
| Time to value | 2-4 weeks | 4-6 weeks | 2-3 months | 12+ months |
| Write operations | Via agents | Full (MCPs) | Full (MCPs) | Full |
| Compliance | Included | Included | DIY | DIY |

**5-Year Total Cost of Ownership**:
- **Option E (Glean-first)**: $1.5-3M (lowest eng overhead)
- **Option A (Glean + Ondo-AI)**: $1.5-3M + $100-200K eng time
- **Option B (Onyx + Ondo-AI)**: $200-400K + significant eng time
- **Full DIY**: $2-4M (mostly engineering)

### The Real Question

```
┌────────────────────────────────────────────────────────────────┐
│                 IS CUSTOM UI WORTH IT?                          │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Custom UI (Options A, B, C, D) gives you:                     │
│  ├─ Multi-model flexibility (GPT-4, Claude, etc.)             │
│  ├─ Custom workflows and prompt templates                      │
│  ├─ Full control over UX                                       │
│  └─ Differentiation from standard tools                        │
│                                                                │
│  Custom UI costs you:                                          │
│  ├─ 20-50% of an engineer's time (ongoing)                    │
│  ├─ UI maintenance and bug fixes                               │
│  ├─ Feature requests and scope creep                           │
│  └─ Two interfaces for users to learn                          │
│                                                                │
│  Glean-first (Option E) gives you:                             │
│  ├─ Single interface for all knowledge                         │
│  ├─ Enterprise search out of box                               │
│  ├─ 90% less engineering overhead                              │
│  └─ Engineers focus on agents, not UI                          │
│                                                                │
│  Glean-first costs you:                                        │
│  ├─ Lock-in to Glean's UX decisions                           │
│  ├─ Limited model choices                                      │
│  └─ Less customization                                         │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

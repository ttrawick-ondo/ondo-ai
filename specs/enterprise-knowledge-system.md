# Building Your Own Enterprise Knowledge System

## The Question
> "If we'd like to essentially build out our own system like Glean, where we can ingest connectors from things like Notion, Gdocs, etc. (using MCPs?) what level of complexity would that be and what functionality could we get?"

---

## TL;DR

| Approach | Complexity | Time | Functionality | Cost (Year 1) |
|----------|------------|------|---------------|---------------|
| **MCP-Only** | Low | 2-4 weeks | Real-time query + write | $5K-20K |
| **MCP + Vector DB** | Medium | 2-3 months | Semantic search + write | $30K-100K |
| **Full RAG System** | High | 6-12 months | Glean-like search | $500K-1M |
| **Open Source (Onyx)** | Medium | 1-3 months | 80% of Glean | $50K-100K |
| **Buy Glean/Dust** | None | 2 weeks | Full enterprise | $300K-600K |

**My Recommendation**: Start with **MCP + Open Source (Onyx)** - gives you 80% of Glean's functionality with full control.

---

## What Glean Actually Does (The Hard Parts)

```
┌─────────────────────────────────────────────────────────────┐
│                    GLEAN ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Layer 3: Knowledge Graph                                   │
│  ├─ Entity resolution (Jane = @jane = jane@company.com)     │
│  ├─ Relationship tracking (who works with whom)             │
│  ├─ Collaboration signals (who reads what)                  │
│  └─ Cross-source deduplication                              │
│                                                             │
│  Layer 2: Unified Index                                     │
│  ├─ 100+ connectors (Notion, Slack, GDrive, etc.)          │
│  ├─ Semantic embeddings (vector search)                     │
│  ├─ Lexical index (BM25 keyword search)                     │
│  └─ Real-time incremental sync                              │
│                                                             │
│  Layer 1: Permission-Aware Query Engine                     │
│  ├─ Sub-100ms response times                                │
│  ├─ Row-level access control                                │
│  ├─ Unified ranking across all sources                      │
│  └─ Result explanations                                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**What makes this hard:**
1. **Unified ranking** - Different sources have different relevance signals
2. **Permission enforcement** - Must check access in real-time, not cached
3. **Entity resolution** - Same person/doc appears in 5+ systems
4. **Sub-100ms latency** - Federated search can't do this
5. **Continuous sync** - Handle rate limits, failures, deletions

---

## Approach 1: MCP-Only (Simplest)

### What You Get
- **Read**: Query Notion, GDrive, Slack, GitHub in real-time
- **Write**: Create pages, update docs, post messages
- **No indexing** - Every search hits live APIs

### Available MCP Servers

| Service | Read | Write | Official? |
|---------|------|-------|-----------|
| **Notion** | ✅ Search, list, get pages | ✅ Create/update pages | Official |
| **Google Drive** | ✅ Search, list, get docs | ✅ Create/update files | Official |
| **Slack** | ✅ Search, read channels | ✅ Post messages | Official |
| **GitHub** | ✅ Search code, issues, PRs | ✅ Create PRs, issues | Official |
| **Confluence** | ✅ Search, get pages | ✅ Create/update | Atlassian |
| **Jira** | ✅ Search, get issues | ✅ Create/update tickets | Atlassian |
| **Linear** | ✅ Search issues | ✅ Create issues | Community |
| **Figma** | ✅ Get designs | ❌ Read-only | Official |

### Architecture
```
┌─────────────────────────────────────────┐
│           Your AI Agent                 │
├─────────────────────────────────────────┤
│                MCP Hub                  │
├────────┬────────┬────────┬─────────────┤
│ Notion │ GDrive │ Slack  │ GitHub ...  │
│  MCP   │  MCP   │  MCP   │   MCP       │
└────────┴────────┴────────┴─────────────┘
```

### Limitations
- ❌ **Slow** - Every search = N API calls (1-2+ seconds)
- ❌ **No unified ranking** - Can't compare Notion vs Slack results
- ❌ **No semantic search** - Only what each API supports
- ❌ **No deduplication** - Same doc in Drive + Notion = 2 results
- ❌ **Basic permissions** - User-level only, no row-level

### When to Use
- Quick prototypes
- Agent tools (search Notion, create Jira ticket)
- Write operations (MCPs excel here)
- <10 users, latency not critical

### Implementation
```typescript
// Install MCP servers
// npm install @anthropic/mcp-notion @anthropic/mcp-gdrive ...

// Configure in claude_desktop_config.json or programmatically
const mcpConfig = {
  notion: { apiKey: process.env.NOTION_API_KEY },
  gdrive: { credentials: process.env.GOOGLE_CREDENTIALS },
  slack: { token: process.env.SLACK_TOKEN },
}
```

**Time**: 2-4 weeks
**Cost**: $5K-20K (dev time + API costs)

---

## Approach 2: MCP + Vector Database (Medium)

### What You Get
- Everything from Approach 1, PLUS:
- **Semantic search** across all sources
- **Sub-second queries** (indexed, not federated)
- **Basic deduplication**

### Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                      Your Application                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐     ┌─────────────────────────────┐   │
│  │  Query Engine   │────▶│   Vector DB (Qdrant/pgvector) │   │
│  │  (Hybrid Search)│     │   + Embeddings               │   │
│  └────────┬────────┘     └─────────────────────────────┘   │
│           │                          ▲                      │
│           │                          │ Sync                 │
│           ▼                          │                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              MCP Servers (Write + Real-time Read)    │   │
│  │  Notion │ GDrive │ Slack │ GitHub │ Confluence │ ...│   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Components Needed

1. **Vector Database** (pick one):
   - **pgvector** - Simplest, works with existing Postgres
   - **Qdrant** - Best for filtering, self-hosted
   - **Chroma** - Easiest to start, limited scale

2. **Embedding Model**:
   - **Nomic Embed v2** (free, self-hosted)
   - **OpenAI text-embedding-3-small** ($0.02/1M tokens)

3. **Sync Pipeline**:
   - Pull from MCPs periodically
   - Chunk documents
   - Generate embeddings
   - Store in vector DB

### Implementation Sketch
```typescript
// Sync pipeline (runs on schedule)
async function syncNotion() {
  const notion = getMCPServer('notion')
  const pages = await notion.listPages({ updated_since: lastSync })

  for (const page of pages) {
    const content = await notion.getPageContent(page.id)
    const chunks = chunkDocument(content)
    const embeddings = await embed(chunks)

    await vectorDB.upsert({
      id: `notion:${page.id}`,
      vectors: embeddings,
      metadata: {
        source: 'notion',
        title: page.title,
        url: page.url,
        permissions: page.permissions, // For filtering
      }
    })
  }
}

// Search (fast, uses index)
async function search(query: string, userId: string) {
  const userPermissions = await getPermissions(userId)

  return vectorDB.search({
    query: await embed(query),
    filter: { permissions: { $in: userPermissions } },
    limit: 10,
  })
}

// Write (uses MCP directly)
async function createNotionPage(title: string, content: string) {
  const notion = getMCPServer('notion')
  return notion.createPage({ title, content })
}
```

### Limitations
- ⚠️ **Sync lag** - Index is minutes/hours behind
- ⚠️ **No collaboration signals** - Can't rank by "what's popular"
- ⚠️ **Basic permissions** - Metadata filtering only
- ⚠️ **Manual chunking** - Must tune per content type

**Time**: 2-3 months
**Cost**: $30K-100K (dev time + infrastructure)

---

## Approach 3: Open Source (Onyx/Danswer) - RECOMMENDED

### What You Get
- **40+ connectors** built-in (Slack, Notion, Confluence, etc.)
- **Semantic + keyword search** (hybrid)
- **Permission-aware retrieval**
- **AI assistant** with citations
- **80% of Glean's functionality**

### Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                       Onyx (Danswer)                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  AI Assistant + Chat Interface                        │  │
│  └──────────────────────────────────────────────────────┘  │
│                          │                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Hybrid Search Engine (Vespa / Elasticsearch)         │  │
│  │  • Vector search (semantic)                           │  │
│  │  • BM25 (keyword)                                     │  │
│  │  • Permission filtering                               │  │
│  └──────────────────────────────────────────────────────┘  │
│                          │                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Built-in Connectors                                  │  │
│  │  Slack │ Notion │ Confluence │ GDrive │ GitHub │ ... │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### What Onyx Provides Out-of-Box

| Feature | Onyx | Glean |
|---------|------|-------|
| Connectors | 40+ | 100+ |
| Semantic search | ✅ | ✅ |
| Keyword search | ✅ | ✅ |
| Permissions | ✅ Basic | ✅ Advanced |
| AI chat | ✅ | ✅ |
| Knowledge graph | ❌ | ✅ |
| Collaboration signals | ❌ | ✅ |
| Entity resolution | ❌ | ✅ |
| Sub-100ms latency | ⚠️ ~200ms | ✅ |

### Extending with MCPs
Onyx handles **read/search**. Add MCPs for **write operations**:

```typescript
// Use Onyx for search
const searchResults = await onyx.search(query, userId)

// Use MCPs for actions
async function handleAction(action: string, params: any) {
  switch (action) {
    case 'create_jira_ticket':
      return jiraMCP.createIssue(params)
    case 'update_notion_page':
      return notionMCP.updatePage(params)
    case 'post_slack_message':
      return slackMCP.postMessage(params)
  }
}
```

### Deployment Options
- **Docker Compose** - Single server, <1000 users
- **Kubernetes** - Scale horizontally
- **Cloud (AWS/GCP)** - Managed infrastructure

**Time**: 1-3 months
**Cost**: $50K-100K (setup + infrastructure)
**Ongoing**: $3K-10K/month (infrastructure only)

---

## Approach 4: Full Custom Build (Glean-Level)

### What You'd Need to Build

1. **Connector Framework**
   - Authentication management (OAuth, API keys)
   - Rate limiting & retry logic
   - Change detection
   - Schema normalization

2. **Indexing Pipeline**
   - Document chunking (semantic-aware)
   - Embedding generation
   - Incremental + full sync
   - Deletion detection

3. **Knowledge Graph**
   - Entity extraction (people, projects, docs)
   - Relationship mapping
   - Cross-source deduplication

4. **Query Engine**
   - Hybrid search (vector + BM25)
   - Permission enforcement
   - Ranking algorithm (100+ signals)
   - Result explanation

5. **Permission System**
   - Real-time access checks
   - Group/role hierarchies
   - Audit logging

### Team Required
- 2-3 senior backend engineers
- 1 ML engineer (embeddings, ranking)
- 1 DevOps engineer
- 6-12 months minimum

**Time**: 12-24 months
**Cost**: $1M-2M (Year 1)

---

## Functionality Matrix

| Capability | MCP Only | MCP+Vector | Onyx | Full Build | Glean |
|------------|----------|------------|------|------------|-------|
| **Read/Query** |
| Search Notion | ✅ Real-time | ✅ Indexed | ✅ | ✅ | ✅ |
| Search GDrive | ✅ Real-time | ✅ Indexed | ✅ | ✅ | ✅ |
| Search Slack | ✅ Real-time | ✅ Indexed | ✅ | ✅ | ✅ |
| Semantic search | ❌ | ✅ | ✅ | ✅ | ✅ |
| Unified ranking | ❌ | ⚠️ Basic | ✅ | ✅ | ✅ |
| Sub-second latency | ❌ | ✅ | ⚠️ ~200ms | ✅ | ✅ |
| **Write** |
| Create Notion pages | ✅ | ✅ | ❌ | ✅ | ❌ |
| Update Google Docs | ✅ | ✅ | ❌ | ✅ | ❌ |
| Post to Slack | ✅ | ✅ | ❌ | ✅ | ❌ |
| Create Jira tickets | ✅ | ✅ | ❌ | ✅ | ❌ |
| **Advanced** |
| Permission filtering | ⚠️ Basic | ⚠️ Metadata | ✅ | ✅ | ✅ |
| Knowledge graph | ❌ | ❌ | ❌ | ✅ | ✅ |
| Entity resolution | ❌ | ❌ | ❌ | ✅ | ✅ |
| Collaboration signals | ❌ | ❌ | ❌ | ✅ | ✅ |

---

## Recommended Architecture for Ondo-AI

```
┌─────────────────────────────────────────────────────────────┐
│                    Ondo-AI Knowledge Layer                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  AI Chat Interface (existing)                         │  │
│  │  + Agent System (new src/lib/agents/)                 │  │
│  └────────────────────────┬─────────────────────────────┘  │
│                           │                                 │
│  ┌────────────────────────┴─────────────────────────────┐  │
│  │              Unified Tool Layer                       │  │
│  ├───────────────────────┬──────────────────────────────┤  │
│  │  Search Tools         │  Action Tools (MCPs)         │  │
│  │  ├─ Onyx/Danswer API  │  ├─ Notion MCP (write)       │  │
│  │  │  (semantic search) │  ├─ Slack MCP (post)         │  │
│  │  └─ Glean API         │  ├─ Jira MCP (create)        │  │
│  │     (if licensed)     │  └─ GitHub MCP (PR/issues)   │  │
│  └───────────────────────┴──────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Data Sources                                         │  │
│  │  Notion │ Google Drive │ Slack │ Confluence │ ...    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Phase 1: MCP Tools for Actions (2 weeks)
- Add MCP servers for Notion, Slack, Jira, GitHub
- Integrate as tools in your agent framework
- Enable: "Create a Jira ticket", "Post to Slack", "Update Notion page"

### Phase 2: Self-Hosted Search (1-2 months)
- Deploy Onyx (Danswer) alongside ondo-ai
- Connect your data sources
- Add as search tool in your agent framework
- Enable: "Search company knowledge base"

### Phase 3: Hybrid System (2-3 months)
- Use Onyx for search, MCPs for write
- Build custom integrations as needed
- Add permissions if multi-tenant

---

## Decision Checklist

**Go with MCP-only if:**
- [ ] You mainly need write operations (create tickets, post messages)
- [ ] Search is secondary or source-specific
- [ ] <10 users, latency not critical
- [ ] Want to ship in <1 month

**Go with Onyx + MCP if:**
- [ ] You need good search across 5+ sources
- [ ] Have engineering resources for deployment
- [ ] Want to avoid vendor lock-in
- [ ] 10-1000 users
- [ ] Budget: $50K-100K

**Go with Glean/Dust if:**
- [ ] >500 users
- [ ] Need enterprise compliance (SOC2, etc.)
- [ ] No engineering resources for self-hosting
- [ ] Budget: $300K+/year

---

## Next Steps

1. **Quick Win**: Add MCP servers for your most-used tools (Notion, Slack)
2. **Search Foundation**: Evaluate Onyx with a single connector
3. **Integrate**: Connect to your existing agent framework
4. **Scale**: Add more connectors, tune permissions

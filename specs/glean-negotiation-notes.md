# Glean Negotiation Analysis

**Date**: January 28, 2026
**Context**: Review of Jackson's response to Brendan's questions

---

## TL;DR for Biz Ops Call

| Claim | Jackson's Statement | Verified? | Impact |
|-------|---------------------|-----------|--------|
| Agent creation via API | "Actively designing JSON schema import/export" | ⚠️ Roadmap | Not available today |
| Write actions via API | "Unavailable when calling agents via API" | ✅ Confirmed | **Major limitation** |
| Slack indexing blocked | "Slack's RTS terms prohibit long-term indexes" | ✅ Confirmed | Industry-wide issue |
| Notion freshness | "~6 hours for indexed, real-time with Live Mode" | ✅ Confirmed | Acceptable |
| FlexCredit lock-in | "Rates fixed for full term (not just year 1)" | ✅ Good protection | Positive |

**Bottom line**: Jackson is being straight with you. The write limitation via API is real and annoying—you'll need to build custom action endpoints. The Slack restriction is a Slack policy, not Glean's choice.

---

## Deep Dive: Write Operations

### What Jackson Said
> "Glean agents support rich, pre‑built write actions (e.g., Jira, Salesforce, etc) only when they run inside Glean (UI, Slack, scheduled/content triggers). These pre‑built write actions are unavailable when calling agents via the Agents API or as an MCP tool – those runs are effectively read‑only."

### Verification
**This is accurate.** Glean's own documentation confirms:

> "Agents that include write actions (actions that modify data or external systems) cannot be added to MCP servers." — [Glean Docs: Agents as MCP Tools](https://docs.glean.com/administration/platform/mcp/agents-as-tools)

This restriction also cascades to sub-agents—if any agent in the chain has write actions, the whole thing is blocked from API/MCP access.

### What This Means for You

```
┌─────────────────────────────────────────────────────────────┐
│              GLEAN WRITE CAPABILITIES                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  WHERE WRITES WORK:                                         │
│  ├─ Glean UI (chat interface)                    ✅         │
│  ├─ Glean Slack bot                              ✅         │
│  ├─ Scheduled triggers                           ✅         │
│  └─ Content triggers                             ✅         │
│                                                             │
│  WHERE WRITES DON'T WORK:                                   │
│  ├─ Agents API (programmatic calls)              ❌         │
│  ├─ MCP tool invocations                         ❌         │
│  └─ Agent Toolkit (unless you build custom)      ⚠️         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### The Workaround (What You'll Need to Build)

If you want write operations via API, you need to:

1. **Create custom actions** in Glean's Developer Portal
2. **Build your own API endpoints** that Glean calls
3. **Handle the actual writes** in your backend

```typescript
// Example: Your backend endpoint that Glean agents call
// POST /api/glean-actions/create-jira-ticket

export async function POST(req: Request) {
  // Glean sends the action request
  const { title, description, project, priority } = await req.json()

  // You handle the actual write to Jira
  const ticket = await jiraClient.createIssue({
    project,
    summary: title,
    description,
    priority,
  })

  // Return result to Glean
  return Response.json({ ticketId: ticket.key, url: ticket.url })
}
```

**Effort estimate**: 2-4 weeks to build custom action endpoints for your key write operations (Jira, HubSpot, Slack posting, etc.)

---

## Deep Dive: Slack Indexing

### What Jackson Said
> "Slack's RTS/Data Access terms explicitly prohibit third‑party apps from creating persistent copies, archives, or long‑term indexes of other organizations' Slack data, so Glean is only allowed to fetch messages on demand and process them in memory."

### Verification
**This is accurate.** Slack/Salesforce updated their API Terms in May 2025:

> "The modifications to the Terms now prohibit... the creation of persistent copies, archives, indexes or long-term data stores" — [Computerworld](https://www.computerworld.com/article/4005509/salesforce-changes-slack-api-terms-to-block-bulk-data-access-for-llms.html)

> "Third-party data discovery app makers will lose access to an important data source, with one, the makers of the Glean app, reported by The Information to have already emailed its customers to explain the move's negative implications." — Industry reporting

This affects ALL third-party search tools (Glean, Guru, etc.), not just Glean.

### Options for Slack Data

**Option 1: Accept the limitation**
- Glean fetches Slack on-demand via RTS API
- Limited to Slack's own search window and relevance
- No deep historical search

**Option 2: Export to your own compliant datastore**
As Jackson suggested, you can:
1. Use Slack's Discovery API (Enterprise Grid required) to export data
2. Store in your own compliant archive (S3, data warehouse, etc.)
3. Have Glean index YOUR datastore instead of Slack directly

### Slack Data Export Options

| Method | Pros | Cons | Effort |
|--------|------|------|--------|
| **Real-time via Slack bot** | Always current, no storage | Limited history, Slack rate limits | 2-3 weeks |
| **Daily cron job** | Full history, batch processing | 24hr lag, storage costs | 1-2 weeks |
| **Discovery API (continuous)** | Real-time + history | Enterprise Grid only, compliance overhead | 3-4 weeks |
| **Manual monthly export** | Simple, compliant | Very stale, manual effort | Minimal |

### Recommendation for Slack Data

**For your use case, I'd suggest a hybrid approach:**

```
┌─────────────────────────────────────────────────────────────┐
│              SLACK DATA ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  OPTION A: Real-time bot + nightly sync                     │
│  ─────────────────────────────────────────                  │
│                                                             │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐   │
│  │ Slack Bot   │────▶│ Your DB     │────▶│ Glean       │   │
│  │ (real-time) │     │ (archive)   │     │ (indexes)   │   │
│  └─────────────┘     └─────────────┘     └─────────────┘   │
│        │                   ▲                               │
│        │                   │                               │
│        └───────────────────┘                               │
│          On-demand fetch for                               │
│          messages bot sees                                 │
│                                                             │
│  + Nightly cron job to backfill                            │
│    any messages bot missed                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘

│  OPTION B: Discovery API (if Enterprise Grid)              │
│  ─────────────────────────────────────────                  │
│                                                             │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐   │
│  │ Discovery   │────▶│ Compliant   │────▶│ Glean       │   │
│  │ API Export  │     │ Archive     │     │ (indexes)   │   │
│  └─────────────┘     └─────────────┘     └─────────────┘   │
│                                                             │
│  Continuous export of all messages                         │
│  Full history, compliance-ready                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**My recommendation**: Start with **Option A** (real-time bot + nightly sync). It's simpler to implement and doesn't require Enterprise Grid. You can always upgrade to Discovery API later if you need full compliance.

---

## Agent Export & Portability

### What Jackson Said
> "We're actively designing a schema‑based import/export (JSON/YAML) for agent definitions... All of the core pieces of an agent (instructions, steps, tool wiring, and logs) are accessible in standard JSON via our APIs."

### What This Means
- **Today**: You can READ agent definitions via API, but authoring happens in Builder UI
- **Roadmap**: JSON/YAML import/export coming (no timeline given)
- **Export to MCP/A2A**: Glean says they'll help you map to standard formats

### Risk Assessment
- If you leave Glean, you can export agent configs as JSON
- But you'd need to rebuild the execution layer elsewhere
- Not a hard lock-in, but not trivially portable either

---

## Business Terms Validation

### FlexCredit Pricing
Jackson attached a rate card to the order form. Make sure you have this document and understand:
- Per-credit rates at different volume tiers
- What actions consume how many credits
- The preview period (6 months on 1-year, 12 months on 2-year) where overages aren't billed

### Cost Lock-in
Jackson's clarification is favorable:
- Per-credit rates locked for **full contract term** (not just year 1)
- 3% annual cap only applies to SaaS lines (seats, support)
- Credits are actually better protected than the base subscription

### No Trial, But...
The "preview period" structure is reasonable:
- Generous included credit pool
- No overage billing during preview
- Admin dashboards to monitor usage
- You can shut down high-consumption agents before cost issues

---

## Action Items for Biz Ops Call

### Questions to Discuss

1. **Write operations**: Are we okay building custom action endpoints, or is this a blocker?
   - Effort: 2-4 weeks for key integrations
   - Ongoing: Maintenance of those endpoints

2. **Slack data strategy**: Which approach do we want?
   - [ ] Accept Glean's on-demand RTS (limited history)
   - [ ] Build real-time bot + nightly sync (2-3 weeks)
   - [ ] Discovery API if we have Enterprise Grid (3-4 weeks)

3. **Agent portability**: Do we need contractual assurance on export formats?
   - Jackson offered to help map to MCP/A2A/ACP
   - Should we add this to the contract?

4. **Notion 6-hour lag**: Is this acceptable, or do we need Live Mode everywhere?

### Red Flags to Watch

- No contractual commitment on agent schema import/export timeline
- MFN for new products was declined
- No short trial option (but preview period is reasonable)

### Negotiation Points Still Open

- [ ] Confirm rate card document is attached and understood
- [ ] Clarify what happens to FlexCredits at renewal (do they roll over?)
- [ ] Get commitment on agent export assistance in writing
- [ ] Legal redlines need review

---

---

## Architecture Options

### Current Architecture (Ondo AI as Orchestrator)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER ENTRY POINTS                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────┐              ┌─────────────┐                              │
│   │  Slack Bot  │              │   Web UI    │                              │
│   │  (OndoBot)  │              │ (Ondo AI)   │                              │
│   │             │              │             │                              │
│   │ Host: Render│              │ Host: TBD   │                              │
│   └──────┬──────┘              └──────┬──────┘                              │
│          │                            │                                     │
│          │ Slack OAuth                │ Okta SSO (SAML/OIDC)                │
│          ▼                            ▼                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                           ORCHESTRATION LAYER                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                      Ondo AI Backend API                            │   │
│   │                         (Hosted on Render)                          │   │
│   │                                                                     │   │
│   │  • Request classification & routing                                 │   │
│   │  • User context & permissions (via Okta groups)                     │   │
│   │  • Audit logging                                                    │   │
│   │  • Rate limiting                                                    │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                          │              │              │                    │
│                          ▼              ▼              ▼                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                           AI SERVICE LAYER                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌───────────────┐    ┌───────────────┐    ┌───────────────┐              │
│   │     Glean     │    │    OpenAI     │    │   Anthropic   │              │
│   │  (Retrieval)  │    │  (Reasoning)  │    │   (Claude)    │              │
│   └───────────────┘    └───────────────┘    └───────────────┘              │
│                                                                             │
│   • Enterprise search     • GPT-4 Turbo      • Claude 3.5/4                │
│   • ACL-aware results     • Summarization    • Long context                │
│   • Source attribution    • Generation       • Code generation             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Pros**: Full model flexibility, custom routing logic
**Cons**: You maintain the orchestration layer, model costs are separate

---

### Option E: Glean as Primary Orchestrator

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER ENTRY POINTS                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                    │
│   │  Slack Bot  │    │  Glean UI   │    │  Glean MCP  │                    │
│   │  (OndoBot)  │    │  (Primary)  │    │  (Agents)   │                    │
│   └──────┬──────┘    └──────┬──────┘    └──────┬──────┘                    │
│          │                  │                  │                            │
│          │                  │ Okta SSO         │                            │
│          ▼                  ▼                  ▼                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                     GLEAN ORCHESTRATION LAYER                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                         Glean Platform                              │   │
│   │                                                                     │   │
│   │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │   │
│   │  │ Enterprise      │  │ Model Router    │  │ Agent Runtime   │     │   │
│   │  │ Search + RAG    │  │                 │  │                 │     │   │
│   │  │                 │  │ • GPT-4o        │  │ • Custom agents │     │   │
│   │  │ • 100+ sources  │  │ • Claude 3.5   │  │ • Workflows     │     │   │
│   │  │ • Knowledge     │  │ • Gemini Pro   │  │ • Actions       │     │   │
│   │  │   graph         │  │ • Mistral      │  │                 │     │   │
│   │  │ • Permissions   │  │                 │  │                 │     │   │
│   │  └─────────────────┘  └─────────────────┘  └─────────────────┘     │   │
│   │                                                                     │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                          │                           │                      │
│           Retrieval      │         Reasoning         │      Actions         │
│                          ▼                           ▼                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                        CUSTOM ACTIONS (You Build)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌───────────────┐    ┌───────────────┐    ┌───────────────┐              │
│   │   OndoBot     │    │   HubSpot     │    │   Internal    │              │
│   │   Actions     │    │   Actions     │    │   APIs        │              │
│   └───────────────┘    └───────────────┘    └───────────────┘              │
│                                                                             │
│   • Employee lookup      • CRM writes        • IT ticketing                │
│   • Policy search        • Deal updates      • Approval workflows          │
│   • Benefits info        • Contact sync      • Custom integrations         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Pros**: Glean handles search + model routing, less to maintain
**Cons**: Model selection limited to Glean's supported models, write actions need custom endpoints

---

### Hybrid: Glean for Search, Ondo AI for Custom Routing

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER ENTRY POINTS                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────┐              ┌─────────────┐                              │
│   │  Slack Bot  │              │   Web UI    │                              │
│   │  (OndoBot)  │              │ (Ondo AI)   │                              │
│   └──────┬──────┘              └──────┬──────┘                              │
│          │                            │                                     │
│          └────────────┬───────────────┘                                     │
│                       ▼                                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                      ONDO AI ROUTING LAYER                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                   Request Classification                            │   │
│   │                                                                     │   │
│   │   "What's our PTO policy?"  ──────────────▶  Route to Glean        │   │
│   │   "Summarize this doc"      ──────────────▶  Route to Glean        │   │
│   │   "Write code for X"        ──────────────▶  Route to Claude       │   │
│   │   "Create a Jira ticket"    ──────────────▶  Route to Glean Agent  │   │
│   │   "Analyze this data"       ──────────────▶  Route to GPT-4        │   │
│   │                                                                     │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                    │                    │                    │              │
│                    ▼                    ▼                    ▼              │
├─────────────────────────────────────────────────────────────────────────────┤
│                           AI SERVICE LAYER                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌───────────────────────┐  ┌───────────────┐  ┌───────────────┐          │
│   │        Glean          │  │    OpenAI     │  │   Anthropic   │          │
│   │                       │  │               │  │               │          │
│   │  Search + Retrieval   │  │   GPT-4o      │  │   Claude 4    │          │
│   │         +             │  │   o1-preview  │  │   Opus        │          │
│   │  Glean's Model Router │  │               │  │   Sonnet      │          │
│   │  (for RAG queries)    │  │               │  │               │          │
│   │         +             │  │               │  │               │          │
│   │  Agent Execution      │  │               │  │               │          │
│   │                       │  │               │  │               │          │
│   └───────────────────────┘  └───────────────┘  └───────────────┘          │
│          │                                                                  │
│          ▼                                                                  │
│   ┌───────────────────────┐                                                │
│   │   Custom Actions      │                                                │
│   │   (OndoBot, HubSpot)  │                                                │
│   └───────────────────────┘                                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Pros**: Best of both worlds - Glean for enterprise search/RAG, direct model access for specialized tasks
**Cons**: More complex routing logic, two systems to maintain

---

### Architecture Comparison

| Aspect | Current | Option E (Glean-first) | Hybrid |
|--------|---------|------------------------|--------|
| **Search** | Glean API | Glean native | Glean native |
| **Model selection** | You route | Glean routes | You route (with Glean option) |
| **Supported models** | Any | Glean's list | Any |
| **Write operations** | Direct API | Custom actions | Custom actions via Glean |
| **Maintenance** | High | Low | Medium |
| **Flexibility** | High | Medium | High |
| **Cost** | Models + Glean | Glean (includes models) | Models + Glean |

### Glean's Supported Models (for reference)

When using Glean's model router, you can select from:
- GPT-4o, GPT-4 Turbo (OpenAI)
- Claude 3.5 Sonnet, Claude 3 Opus (Anthropic)
- Gemini Pro (Google)
- Mistral Large
- Custom/fine-tuned models (enterprise tier)

Model selection can be configured per-agent or per-action in the Glean Builder UI.

---

## Sources

- [Glean: Agents as MCP Tools](https://docs.glean.com/administration/platform/mcp/agents-as-tools)
- [Glean: Creating Actions](https://developers.glean.com/guides/actions/create-actions)
- [Glean Agent Toolkit](https://developers.glean.com/guides/agents/toolkit)
- [Computerworld: Salesforce changes Slack API terms](https://www.computerworld.com/article/4005509/salesforce-changes-slack-api-terms-to-block-bulk-data-access-for-llms.html)
- [Slack: Discovery API Guide](https://slack.com/help/articles/360002079527-A-guide-to-Slacks-Discovery-APIs)

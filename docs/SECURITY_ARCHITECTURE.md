# Ondo AI Assistant - Security Architecture Overview

**Purpose**: High-level security architecture for security team review
**Status**: Draft for discussion
**Last Updated**: January 2025

---

## System Overview

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
│   │     Glean     │    │    OpenAI     │    │   Future LLM  │              │
│   │  (Retrieval)  │    │  (Reasoning)  │    │   Providers   │              │
│   └───────────────┘    └───────────────┘    └───────────────┘              │
│                                                                             │
│   • Enterprise search     • Synthesis        • Extensible                  │
│   • ACL-aware results     • Summarization    • Same security model         │
│   • Source attribution    • Generation                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Hosting Summary

| Component | Host | Region | Notes |
|-----------|------|--------|-------|
| **Web UI (Ondo AI)** | TBD | TBD | Next.js frontend |
| **Backend API** | Render | US (Oregon) | Python/Node service |
| **Slack Bot (OndoBot)** | Render | US (Oregon) | Shared with backend or separate service |
| **Database** | Render PostgreSQL | US (Oregon) | Managed PostgreSQL |
| **Cache** | Render Redis | US (Oregon) | Session tokens, rate limiting |
| **Glean** | Glean Cloud | Multi-region | Enterprise SaaS |
| **OpenAI** | OpenAI API | US | Enterprise tier |

### Render Security Features

- **SOC 2 Type II** certified
- **TLS 1.2+** for all connections
- **Private networking** between services
- **Automatic DDoS protection**
- **Environment variable encryption** at rest
- **Zero-trust network** (no public DB access)

---

## 1. Authentication

### Web UI (Ondo AI)

| Aspect | Approach |
|--------|----------|
| **Provider** | Okta SSO via SAML 2.0 or OIDC |
| **Session** | JWT tokens with short expiry + refresh tokens |
| **Storage** | HttpOnly secure cookies (not localStorage) |
| **MFA** | Enforced via Okta policy (org-wide setting) |

### Slack Bot (OndoBot)

| Aspect | Approach |
|--------|----------|
| **Provider** | Slack OAuth 2.0 |
| **Identity Linking** | Map Slack user ID → Okta user via email domain |
| **Session** | Slack maintains session; bot validates per-request |

### Service-to-Service

| Aspect | Approach |
|--------|----------|
| **Backend → Glean** | API key + OAuth service account |
| **Backend → OpenAI** | API key (OpenAI Enterprise) |
| **Secrets Management** | Vault / AWS Secrets Manager / env injection |

---

## 2. Authorization Model

### Hierarchy

```
Organization (Okta Tenant)
  └── Workspaces (mapped to Okta Groups / Teams)
        └── Projects (within workspace)
              └── Conversations (within project or personal)
                    └── Messages
```

### Access Control Matrix

| Resource | Visibility Options | Who Can Access | Who Can Modify |
|----------|-------------------|----------------|----------------|
| **Workspace** | Listed to org, content gated | Okta group members only | Workspace admins |
| **Project** | Private / Workspace / Public | Based on visibility + role | Project owner + admins |
| **Conversation** | Private / Shared | Owner + explicit shares | Owner only |
| **Prompt** | Private / Workspace / Public | Based on visibility | Owner only |
| **Chat History** | Private by default | User's own only | User only (delete) |
| **Retrieved Docs** | N/A (pass-through) | Glean ACL controls | N/A |

### Access Control Examples

**Scenario 1: Engineering Workspace**
```
Okta Group: "engineering"
    ↓
Workspace: "Engineering" (auto-created or mapped)
    ↓
Members see: All workspace projects, shared prompts
Cannot see: Other workspaces' private content, personal conversations
```

**Scenario 2: Cross-team Sharing**
```
User A (Engineering) shares conversation with User B (Product)
    ↓
User B can view that specific conversation
User B cannot access other Engineering workspace content
```

**Scenario 3: Glean Document Access**
```
User searches: "Q4 roadmap"
    ↓
Glean checks: User's Google Drive/Confluence permissions
    ↓
Returns: Only documents user already has access to
    ↓
OpenAI receives: Only those permitted snippets
```

### Role-Based Permissions

| Role | View | Create | Edit | Delete | Manage Members |
|------|------|--------|------|--------|----------------|
| **Viewer** | ✓ | - | - | - | - |
| **Member** | ✓ | ✓ | Own | Own | - |
| **Admin** | ✓ | ✓ | All | All | ✓ |
| **Owner** | ✓ | ✓ | All | All | ✓ (+ transfer) |

### Okta Group Integration

```
Okta Group: "engineering-platform"
    ↓
Maps to Workspace: "Platform Engineering"
    ↓
Members inherit: Viewer/Member/Admin role
    ↓
Can access: Workspace projects, shared prompts, team conversations
```

**Sync Options**:
- Real-time via Okta webhooks (SCIM)
- Periodic sync (every N minutes)
- On-demand at login

---

## 3. Data Flow Security

### Query Classification & Routing

```
User Query
    │
    ▼
┌─────────────────────────────┐
│  Intent Classification      │  (Lightweight LLM or rules)
│  • Retrieval? → Glean       │
│  • Reasoning? → OpenAI      │
│  • Both? → Glean then OpenAI│
└─────────────────────────────┘
    │
    ▼
┌─────────────────────────────┐
│  Permission Check           │
│  • User has access to       │
│    requested resources?     │
│  • Okta group membership    │
│    validated                │
└─────────────────────────────┘
    │
    ▼
┌─────────────────────────────┐
│  Execute with User Context  │
│  • Glean respects user ACLs │
│  • OpenAI receives only     │
│    permitted content        │
└─────────────────────────────┘
```

### Glean Security Model

Glean provides:
- **ACL Enforcement**: Only returns docs the user can access
- **Connector Permissions**: Inherits permissions from source systems (Google Drive, Confluence, etc.)
- **No Data Leakage**: User A cannot see User B's private docs via search

**Integration Note**: Pass user's Okta email to Glean API so it applies correct ACLs.

### What Gets Sent to OpenAI

#### SENT to OpenAI

| Data | Purpose | Notes |
|------|---------|-------|
| User's query text | Required for response | Stripped of any file attachments |
| Retrieved snippets from Glean | Context for synthesis | Already ACL-filtered by Glean |
| Conversation history | Multi-turn context | Configurable window (last N messages) |
| System prompts | Behavior control | No sensitive data in prompts |

#### NEVER SENT to OpenAI

| Data | Reason |
|------|--------|
| Raw internal documents | Only Glean-filtered snippets sent |
| User credentials / tokens | Not relevant to AI queries |
| Full database exports | Size + security |
| PII without consent | Policy enforcement at API layer |
| API keys / secrets | Filtered by content scanner |

#### Data Flow Guarantee

```
User Query → Backend API → Content Scanner → Glean (ACL check) → OpenAI
                              ↓
                         Blocks: PII, secrets, prohibited content
```

**OpenAI Enterprise Terms**: Data not used for training, 30-day retention for abuse monitoring, SOC 2 Type II compliant.

**Alternative**: Azure OpenAI available if stricter data residency required.

---

## 4. Data Storage & Retention

### What We Store

| Data Type | Storage | Retention | Encryption |
|-----------|---------|-----------|------------|
| User profiles | PostgreSQL | Account lifetime | At-rest (AES-256) |
| Conversations | PostgreSQL | Configurable (30/90/365 days) | At-rest |
| Chat messages | PostgreSQL | Same as conversations | At-rest |
| Prompts | PostgreSQL | Until deleted | At-rest |
| Audit logs | Immutable log store | 1-7 years (compliance) | At-rest |
| Session tokens | Redis | 24h / refresh 7d | In-transit (TLS) |

### What We DON'T Store

- Glean API responses (pass-through only)
- OpenAI raw API payloads (unless audit-logging enabled)
- User passwords (Okta handles auth)

---

## 5. Slack Integration Security

### OndoBot Data Flow

```
Slack User
    │
    ├── Slash command / @mention
    │
    ▼
┌─────────────────────────────┐
│  OndoBot (our service)      │
│  • Validates Slack request  │
│    signature                │
│  • Maps Slack ID → Okta ID  │
│  • Applies same permission  │
│    model as Web UI          │
└─────────────────────────────┘
    │
    ▼
Same backend API as Web UI
```

### Slack-Specific Considerations

| Concern | Mitigation |
|---------|------------|
| Request authenticity | Verify Slack signing secret on every request |
| User identity | Map via email domain; require Okta-linked Slack workspace |
| Channel visibility | Bot only responds with data user can access |
| DM vs Channel | Same permissions apply; channel context is metadata only |

---

## 6. Audit & Compliance

### Audit Log Events

- User login/logout
- Query submitted (with classification)
- Resource accessed (project, conversation, prompt)
- Resource shared/unshared
- Permission changes
- Admin actions

### Log Format (example)

```json
{
  "timestamp": "2025-01-05T14:30:00Z",
  "user_id": "okta-abc123",
  "action": "query_submitted",
  "resource_type": "conversation",
  "resource_id": "conv-456",
  "metadata": {
    "query_classification": "retrieval+reasoning",
    "routed_to": ["glean", "openai"],
    "source": "web_ui"
  },
  "ip_address": "10.x.x.x",
  "user_agent": "..."
}
```

---

## 7. Security Questions for Discussion

### Authentication
- [ ] Okta SSO: SAML vs OIDC preference?
- [ ] MFA requirement: Always, or Okta-policy driven?
- [ ] Session duration requirements?

### Authorization
- [ ] Should Okta groups auto-create Workspaces, or manual mapping?
- [ ] Default permission for new workspace members (Viewer vs Member)?
- [ ] Admin delegation model?

### Data Handling
- [ ] Data residency requirements (US-only, EU, etc.)?
- [ ] Retention policy defaults?
- [ ] Right to deletion / export requirements (GDPR, CCPA)?

### OpenAI / LLM
- [ ] Azure OpenAI vs OpenAI Enterprise vs self-hosted?
- [ ] Content filtering requirements?
- [ ] Opt-out for certain data types being sent to LLM?

### Slack
- [ ] Require enterprise grid, or support standard workspaces?
- [ ] Restrict bot to certain channels?
- [ ] DLP scanning for responses?

---

## 8. Recommended Next Steps

1. **Confirm Okta integration pattern** (SAML vs OIDC, group sync approach)
2. **Define data classification** - what's allowed to be sent to external LLMs
3. **Establish retention policies** - per data type
4. **Document incident response** - for potential data exposure
5. **Plan penetration testing** - pre-launch security audit

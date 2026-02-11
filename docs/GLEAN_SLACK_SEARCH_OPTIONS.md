# Glean + Slack Search Options

## Overview

There are multiple approaches for searching Slack data through Glean, each with different trade-offs for data freshness, historical coverage, and implementation complexity.

---

## Options Comparison

| Approach | Historical Data | Real-time | ACL Enforcement | Complexity |
|----------|-----------------|-----------|-----------------|------------|
| **Glean Native Connector** | Limited (90 days) | Yes | Automatic | Low |
| **Glean + Local Slack Data** | Full history | Hybrid | Manual | Medium |
| **Local Search Only** | Full history | Configurable | Manual | Medium |
| **Glean Custom Datasource** | Full history | Configurable | Configurable | High |

---

## Option 1: Glean Native Slack Connector

**Best for:** Real-time search, minimal setup, automatic ACLs

### How It Works
- Glean connects directly to Slack via OAuth
- Syncs public channels automatically
- Private channels require additional permissions
- Respects Slack's native permissions

### Limitations
- **History:** Only syncs ~90 days of messages (varies by plan)
- **No historical backfill:** Can't import Slack exports
- **Real-time only:** What Glean sees from connection date forward

### Setup
1. In Glean Admin → **Data Sources** → **Add Slack**
2. Authorize with Slack workspace admin account
3. Configure which channels to index
4. Wait for initial sync (hours to days)

### Searching via API
```typescript
// src/lib/api/providers/glean.ts
async searchSlack(query: string, userEmail: string) {
  const response = await fetch(`${GLEAN_API_URL}/search`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GLEAN_API_KEY}`,
      'X-Scio-ActAs': userEmail,  // User impersonation for ACL
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      requestOptions: {
        datasourceFilter: {
          datasource: 'slack'  // Filter to Slack results only
        }
      }
    })
  })
  return response.json()
}
```

### ACL Enforcement
- **Automatic:** Glean respects Slack channel membership
- User must exist in both Glean and Slack with matching email
- Private channel results only shown to members
- Uses `X-Scio-ActAs` header to impersonate the searching user

---

## Option 2: Glean + Local Slack Data (Hybrid)

**Best for:** Full historical search with Glean's ranking quality

### How It Works
```
┌─────────────────────────────────────────────────────────────┐
│                      Search Request                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
     ┌─────────────────┐            ┌─────────────────┐
     │  Glean Search   │            │  Local Search   │
     │  (Real-time)    │            │  (Historical)   │
     │  Last 90 days   │            │  Full history   │
     └─────────────────┘            └─────────────────┘
              │                               │
              └───────────────┬───────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  Merge & Rank   │
                    │  Deduplicate    │
                    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  Final Results  │
                    └─────────────────┘
```

### Implementation
```typescript
// src/lib/slack/search.ts
async function hybridSlackSearch(
  query: string,
  userEmail: string,
  options?: { includeHistorical?: boolean }
) {
  // Run searches in parallel
  const [gleanResults, localResults] = await Promise.all([
    searchGleanSlack(query, userEmail),
    options?.includeHistorical
      ? searchLocalSlack(query, userEmail)
      : Promise.resolve([])
  ])

  // Merge and deduplicate by message timestamp
  const merged = mergeResults(gleanResults, localResults)

  // Re-rank if needed (Glean results typically higher quality)
  return rankResults(merged, { preferGlean: true })
}

function mergeResults(glean: SearchResult[], local: SearchResult[]) {
  const seen = new Set<string>()
  const merged: SearchResult[] = []

  // Glean results first (better ranking)
  for (const result of glean) {
    const key = `${result.channelId}:${result.messageTs}`
    if (!seen.has(key)) {
      seen.add(key)
      merged.push({ ...result, source: 'glean' })
    }
  }

  // Add local results not in Glean
  for (const result of local) {
    const key = `${result.channelId}:${result.messageTs}`
    if (!seen.has(key)) {
      seen.add(key)
      merged.push({ ...result, source: 'local' })
    }
  }

  return merged
}
```

### ACL Enforcement
- **Glean results:** Automatic via `X-Scio-ActAs`
- **Local results:** Must check channel membership manually

```typescript
// Filter local results by user access
async function searchLocalSlack(query: string, userEmail: string) {
  const accessibleChannels = await getAccessibleChannelIds(userEmail)

  return prisma.slackMessage.findMany({
    where: {
      slackChannelId: { in: accessibleChannels },
      content: { contains: query }
    }
  })
}
```

---

## Option 3: Local Search Only (SQLite FTS5)

**Best for:** Full control, no Glean dependency, offline capability

### How It Works
- Import Slack export to local database
- Use SQLite FTS5 for full-text search
- Manage ACLs locally

### Implementation
```typescript
// src/lib/slack/search.ts
import { prisma } from '@/lib/db'

async function searchLocalSlackFTS(
  query: string,
  userEmail: string,
  options?: { limit?: number; channelId?: string }
) {
  const accessibleChannels = await getAccessibleChannelIds(userEmail)

  // SQLite FTS5 search
  const results = await prisma.$queryRaw`
    SELECT
      m.id,
      m.slackTs,
      m.content,
      m.slackCreatedAt,
      c.name as channelName,
      u.displayName as authorName,
      highlight(slack_message_fts, 0, '<mark>', '</mark>') as snippet
    FROM slack_message_fts
    JOIN SlackMessage m ON m.id = slack_message_fts.rowid
    JOIN SlackChannel c ON c.slackChannelId = m.slackChannelId
    LEFT JOIN SlackUser u ON u.slackUserId = m.slackUserId
    WHERE slack_message_fts MATCH ${query}
      AND m.slackChannelId IN (${accessibleChannels.join(',')})
    ORDER BY rank
    LIMIT ${options?.limit || 50}
  `

  return results
}
```

### FTS5 Setup (in migration)
```sql
-- Create FTS5 virtual table for message search
CREATE VIRTUAL TABLE IF NOT EXISTS slack_message_fts USING fts5(
  content,
  content=SlackMessage,
  content_rowid=id
);

-- Triggers to keep FTS in sync
CREATE TRIGGER slack_message_ai AFTER INSERT ON SlackMessage BEGIN
  INSERT INTO slack_message_fts(rowid, content) VALUES (new.id, new.content);
END;

CREATE TRIGGER slack_message_ad AFTER DELETE ON SlackMessage BEGIN
  INSERT INTO slack_message_fts(slack_message_fts, rowid, content)
  VALUES('delete', old.id, old.content);
END;

CREATE TRIGGER slack_message_au AFTER UPDATE ON SlackMessage BEGIN
  INSERT INTO slack_message_fts(slack_message_fts, rowid, content)
  VALUES('delete', old.id, old.content);
  INSERT INTO slack_message_fts(rowid, content) VALUES (new.id, new.content);
END;
```

### ACL Enforcement
- Check channel membership before returning results
- Map Okta user email → Slack user → channel memberships

---

## Option 4: Glean Custom Datasource

**Best for:** Full Glean integration with historical data and custom ACLs

### How It Works
- Push local Slack data to Glean as a custom datasource
- Glean handles search, ranking, and RAG
- You control what data gets indexed

### Implementation
```typescript
// src/lib/glean/push-datasource.ts
async function pushSlackToGlean(messages: SlackMessage[]) {
  for (const message of messages) {
    await fetch(`${GLEAN_API_URL}/indexdocuments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GLEAN_INDEXING_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        datasource: 'slack-historical',
        documents: [{
          id: `slack:${message.slackChannelId}:${message.slackTs}`,
          title: `Message in #${message.channelName}`,
          body: {
            text: message.content
          },
          permissions: {
            // Define who can see this document
            allowedUsers: message.channel.isPrivate
              ? message.channel.memberEmails
              : ['*']  // Public = everyone
          },
          metadata: {
            datasource: 'slack-historical',
            channel: message.channelName,
            author: message.authorEmail,
            timestamp: message.slackCreatedAt
          }
        }]
      })
    })
  }
}
```

### Requirements
- Glean Enterprise plan
- Custom datasource configuration in Glean Admin
- Indexing API token
- ACL sync between Slack membership and Glean

### Complexity
- High initial setup
- Must keep ACLs in sync as channel membership changes
- Best search quality (Glean's ML ranking)

---

## Recommendation

For Ondo AI's use case (~100-200 users, need historical data):

### Phase 1: Glean Native + Local Hybrid
1. Enable Glean's native Slack connector for real-time
2. Import Slack export to local database for history
3. Hybrid search merges both sources
4. Local FTS5 for fallback/offline

### Phase 2: Evaluate Custom Datasource
- If search quality on historical data matters
- If ACL management becomes complex
- Consider pushing historical data to Glean

---

## ACL Summary

| Data Source | ACL Method |
|-------------|------------|
| Glean Native Slack | `X-Scio-ActAs` header (automatic) |
| Local Slack Data | Check `SlackChannel.memberUserIds` |
| Glean Custom Datasource | `permissions.allowedUsers` in document |

### X-Scio-ActAs Header Usage
```typescript
// Always pass user email when searching Glean
const headers = {
  'Authorization': `Bearer ${GLEAN_API_KEY}`,
  'X-Scio-ActAs': session.user.email,  // From NextAuth session
}
```

This ensures Glean filters results to only what the user can access in the original source systems.

---

## Resources

- [Glean Slack Connector Docs](https://help.glean.com/en/articles/slack-connector)
- [Glean Search API](https://developers.glean.com/docs/search_api)
- [Glean Custom Datasources](https://developers.glean.com/docs/indexing_api)
- [SQLite FTS5 Documentation](https://www.sqlite.org/fts5.html)

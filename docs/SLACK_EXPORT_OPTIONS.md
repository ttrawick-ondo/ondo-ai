# Slack Export Options

## Overview

Slack provides several ways to export workspace data. The export method available depends on your Slack plan and what data you need.

---

## Export Types Comparison

| Export Type | Plan Required | Includes Private Channels | Includes DMs | Approval Required |
|-------------|---------------|---------------------------|--------------|-------------------|
| Standard Export | Any | No | No | Workspace Admin |
| Corporate Export | Business+ / Enterprise Grid | Yes | Yes | Org Owner + Legal |
| Discovery API | Enterprise Grid | Yes | Yes | Org Owner |

---

## Option 1: Standard Export (Recommended for Most Cases)

**Available on:** Free, Pro, Business+, Enterprise Grid

**What's included:**
- ✅ Public channel messages
- ✅ Channel metadata (name, topic, purpose)
- ✅ User profiles (name, email, display name)
- ✅ File references (not actual files)
- ✅ Reactions, threads, pins
- ❌ Private channels
- ❌ Direct messages
- ❌ Actual uploaded files

**How to export:**

1. Go to [your-workspace].slack.com/services/export
2. Or: **Settings & Administration** → **Workspace Settings** → **Import/Export Data** → **Export**
3. Select date range (or export all)
4. Click **Start Export**
5. You'll receive an email when ready (can take hours for large workspaces)
6. Download the ZIP file

**Who can do this:** Workspace Owners and Admins

---

## Option 2: Corporate Export

**Available on:** Business+ and Enterprise Grid only

**What's included:**
- ✅ Everything in Standard Export
- ✅ Private channels
- ✅ Direct messages (DMs)
- ✅ Group DMs

**Requirements:**
- Must be enabled by Org Owner
- May require legal/compliance approval
- Some organizations require e-discovery tool integration

**How to request:**

1. Contact your Slack Org Owner
2. They must enable Corporate Export in Org Settings
3. May need to submit compliance justification
4. Export is then available via same interface as Standard Export

---

## Option 3: Discovery API (Enterprise Grid Only)

**Available on:** Enterprise Grid only

**What's included:**
- ✅ All message data
- ✅ Programmatic access
- ✅ Real-time or scheduled exports
- ✅ Granular filtering

**Use case:** Automated compliance, legal holds, continuous backup

**Note:** Requires API development work; not a simple download.

---

## Export File Structure

Slack exports are ZIP files containing:

```
slack-export/
├── channels.json           # Channel metadata
├── users.json              # User profiles
├── integration_logs.json   # App/bot activity
└── [channel-name]/         # One folder per channel
    ├── 2024-01-01.json     # Messages by date
    ├── 2024-01-02.json
    └── ...
```

### channels.json
```json
[
  {
    "id": "C1234567890",
    "name": "general",
    "created": 1600000000,
    "creator": "U1234567890",
    "is_archived": false,
    "is_general": true,
    "members": ["U1234567890", "U0987654321"],
    "topic": { "value": "Company-wide announcements" },
    "purpose": { "value": "General discussion" }
  }
]
```

### users.json
```json
[
  {
    "id": "U1234567890",
    "name": "jsmith",
    "real_name": "John Smith",
    "profile": {
      "email": "john.smith@company.com",
      "display_name": "John",
      "image_72": "https://..."
    },
    "is_admin": false,
    "is_bot": false,
    "deleted": false
  }
]
```

### Message Files (YYYY-MM-DD.json)
```json
[
  {
    "type": "message",
    "user": "U1234567890",
    "text": "Hello everyone!",
    "ts": "1234567890.123456",
    "reactions": [
      { "name": "thumbsup", "users": ["U111", "U222"], "count": 2 }
    ]
  },
  {
    "type": "message",
    "user": "U0987654321",
    "text": "Welcome!",
    "ts": "1234567891.000000",
    "thread_ts": "1234567890.123456"
  }
]
```

---

## Preparing for Export

### Before You Export

1. **Estimate size:** Large workspaces (100k+ messages) can take hours to export
2. **Choose date range:** Full history vs. specific period
3. **Notify stakeholders:** If exporting for compliance/legal reasons
4. **Plan storage:** Exports can be several GB for active workspaces

### After Export

1. **Verify download:** Check ZIP integrity
2. **Secure storage:** Export contains potentially sensitive data
3. **Retention policy:** Delete export after import if not needed

---

## For Ondo AI Import

Once you have the Slack export ZIP file:

1. Extract the ZIP to access the JSON files
2. Upload via the Ondo AI admin interface (when available)
3. The system will parse:
   - `users.json` → SlackUser records
   - `channels.json` → SlackChannel records
   - `[channel]/*.json` → SlackMessage records

**Data mapping:**
| Slack Field | Ondo AI Field |
|-------------|---------------|
| `user.profile.email` | Links to Ondo user |
| `channel.id` | `slackChannelId` |
| `channel.members` | ACL for private channels |
| `message.ts` | `slackTs` (unique ID) |
| `message.thread_ts` | Thread association |

---

## Limitations & Notes

- **File attachments:** Standard export only includes file *references*, not actual files
- **Edit history:** Only final message content is included
- **Deleted messages:** Not included in export
- **Apps/bots:** Messages from apps are included but marked with `bot_id`
- **Canvases/Lists:** Slack's newer features may not be fully exported

---

## Quick Start Checklist

- [ ] Confirm you have Workspace Admin access
- [ ] Go to `[workspace].slack.com/services/export`
- [ ] Select date range (recommend: last 90 days for initial import)
- [ ] Start export and wait for email notification
- [ ] Download ZIP file
- [ ] Securely transfer to dev team for import

---

## Resources

- [Slack Export Documentation](https://slack.com/help/articles/201658943-Export-your-workspace-data)
- [Understanding Slack Exports](https://slack.com/help/articles/220556107-How-to-read-Slack-data-exports)
- [Corporate Export Guide](https://slack.com/help/articles/204897248-Guide-to-Slack-data-exports) (Business+ only)

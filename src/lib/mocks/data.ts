import type { User, Conversation, Message, Project, Workspace, WorkspaceMember, Prompt, PromptCategory } from '@/types'

// Current user mock
export const mockCurrentUser: User = {
  id: 'user-1',
  email: 'alex@company.com',
  name: 'Alex Johnson',
  avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alex',
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-12-01'),
}

// Mock users for workspace
export const mockUsers: User[] = [
  mockCurrentUser,
  {
    id: 'user-2',
    email: 'sarah@company.com',
    name: 'Sarah Chen',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah',
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-11-15'),
  },
  {
    id: 'user-3',
    email: 'mike@company.com',
    name: 'Mike Wilson',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=mike',
    createdAt: new Date('2024-03-10'),
    updatedAt: new Date('2024-10-20'),
  },
  {
    id: 'user-4',
    email: 'emma@company.com',
    name: 'Emma Davis',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=emma',
    createdAt: new Date('2024-04-05'),
    updatedAt: new Date('2024-12-10'),
  },
]

// Mock workspaces
export const mockWorkspaces: Workspace[] = [
  {
    id: 'ws-1',
    name: 'Engineering',
    description: 'Engineering team workspace for technical discussions and coding assistance',
    ownerId: 'user-1',
    memberCount: 12,
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-12-15'),
  },
  {
    id: 'ws-2',
    name: 'Marketing',
    description: 'Marketing team for content creation and campaign planning',
    ownerId: 'user-2',
    memberCount: 8,
    createdAt: new Date('2024-02-15'),
    updatedAt: new Date('2024-12-10'),
  },
  {
    id: 'ws-3',
    name: 'Product',
    description: 'Product team workspace for feature planning and user research',
    ownerId: 'user-1',
    memberCount: 6,
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-12-01'),
  },
]

// Mock workspace members
export const mockWorkspaceMembers: WorkspaceMember[] = [
  {
    id: 'wm-1',
    workspaceId: 'ws-1',
    userId: 'user-1',
    user: mockUsers[0],
    role: 'owner',
    joinedAt: new Date('2024-01-20'),
  },
  {
    id: 'wm-2',
    workspaceId: 'ws-1',
    userId: 'user-2',
    user: mockUsers[1],
    role: 'admin',
    joinedAt: new Date('2024-01-25'),
  },
  {
    id: 'wm-3',
    workspaceId: 'ws-1',
    userId: 'user-3',
    user: mockUsers[2],
    role: 'member',
    joinedAt: new Date('2024-02-01'),
  },
  {
    id: 'wm-4',
    workspaceId: 'ws-1',
    userId: 'user-4',
    user: mockUsers[3],
    role: 'member',
    joinedAt: new Date('2024-03-15'),
  },
]

// Mock projects
export const mockProjects: Project[] = [
  {
    id: 'proj-1',
    name: 'API Development',
    description: 'Backend API architecture and development assistance',
    color: '#3b82f6',
    workspaceId: 'ws-1',
    userId: 'user-1',
    conversationCount: 24,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-12-20'),
  },
  {
    id: 'proj-2',
    name: 'Frontend Redesign',
    description: 'UI/UX improvements and React component development',
    color: '#8b5cf6',
    workspaceId: 'ws-1',
    userId: 'user-1',
    conversationCount: 18,
    createdAt: new Date('2024-03-15'),
    updatedAt: new Date('2024-12-18'),
  },
  {
    id: 'proj-3',
    name: 'Q4 Campaign',
    description: 'Marketing campaign planning and content creation',
    color: '#ec4899',
    workspaceId: 'ws-2',
    userId: 'user-2',
    conversationCount: 12,
    createdAt: new Date('2024-09-01'),
    updatedAt: new Date('2024-12-15'),
  },
  {
    id: 'proj-4',
    name: 'Personal Notes',
    description: 'Personal brainstorming and learning',
    color: '#22c55e',
    userId: 'user-1',
    conversationCount: 8,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-12-19'),
  },
]

// Mock conversations
export const mockConversations: Conversation[] = [
  {
    id: 'conv-1',
    title: 'Database optimization strategies',
    projectId: 'proj-1',
    workspaceId: 'ws-1',
    userId: 'user-1',
    messageCount: 12,
    lastMessageAt: new Date('2024-12-20T14:30:00'),
    createdAt: new Date('2024-12-20T10:00:00'),
    updatedAt: new Date('2024-12-20T14:30:00'),
  },
  {
    id: 'conv-2',
    title: 'React component architecture',
    projectId: 'proj-2',
    workspaceId: 'ws-1',
    userId: 'user-1',
    messageCount: 8,
    lastMessageAt: new Date('2024-12-19T16:45:00'),
    createdAt: new Date('2024-12-19T09:00:00'),
    updatedAt: new Date('2024-12-19T16:45:00'),
  },
  {
    id: 'conv-3',
    title: 'API authentication flow',
    projectId: 'proj-1',
    workspaceId: 'ws-1',
    userId: 'user-1',
    messageCount: 15,
    lastMessageAt: new Date('2024-12-18T11:20:00'),
    createdAt: new Date('2024-12-17T14:00:00'),
    updatedAt: new Date('2024-12-18T11:20:00'),
  },
  {
    id: 'conv-4',
    title: 'Blog post ideas for product launch',
    projectId: 'proj-3',
    workspaceId: 'ws-2',
    userId: 'user-2',
    messageCount: 6,
    lastMessageAt: new Date('2024-12-17T09:30:00'),
    createdAt: new Date('2024-12-17T08:00:00'),
    updatedAt: new Date('2024-12-17T09:30:00'),
  },
  {
    id: 'conv-5',
    title: 'Learning Rust basics',
    projectId: 'proj-4',
    userId: 'user-1',
    messageCount: 20,
    lastMessageAt: new Date('2024-12-16T20:15:00'),
    createdAt: new Date('2024-12-15T10:00:00'),
    updatedAt: new Date('2024-12-16T20:15:00'),
  },
]

// Mock messages for conversation 1
export const mockMessages: Record<string, Message[]> = {
  'conv-1': [
    {
      id: 'msg-1',
      conversationId: 'conv-1',
      role: 'user',
      content: 'What are the best strategies for optimizing PostgreSQL queries in a high-traffic application?',
      createdAt: new Date('2024-12-20T10:00:00'),
    },
    {
      id: 'msg-2',
      conversationId: 'conv-1',
      role: 'assistant',
      content: `Here are some effective strategies for optimizing PostgreSQL queries in high-traffic applications:

## 1. Indexing Strategy

- **Create appropriate indexes** for frequently queried columns
- Use **composite indexes** for multi-column queries
- Consider **partial indexes** for filtered queries
- Use **EXPLAIN ANALYZE** to verify index usage

\`\`\`sql
-- Example composite index
CREATE INDEX idx_users_status_created
ON users(status, created_at DESC)
WHERE deleted_at IS NULL;
\`\`\`

## 2. Query Optimization

- Avoid **SELECT *** - specify only needed columns
- Use **pagination** with keyset pagination for large datasets
- Leverage **CTEs** (Common Table Expressions) for complex queries
- Consider **materialized views** for expensive aggregations

## 3. Connection Pooling

Use **PgBouncer** or similar connection poolers to:
- Reduce connection overhead
- Handle connection limits efficiently
- Improve response times

## 4. Caching Layer

- Implement **Redis** for frequently accessed data
- Use **query result caching** where appropriate
- Consider **read replicas** for read-heavy workloads

Would you like me to dive deeper into any of these strategies?`,
      metadata: {
        model: 'claude-3-opus',
        tokenCount: 245,
        processingTimeMs: 1850,
      },
      createdAt: new Date('2024-12-20T10:01:00'),
    },
    {
      id: 'msg-3',
      conversationId: 'conv-1',
      role: 'user',
      content: 'Can you show me how to implement keyset pagination? Our current offset-based pagination is slow on large tables.',
      createdAt: new Date('2024-12-20T10:05:00'),
    },
    {
      id: 'msg-4',
      conversationId: 'conv-1',
      role: 'assistant',
      content: `Keyset pagination (also called cursor-based pagination) is much more efficient than offset pagination for large datasets. Here's how to implement it:

## The Problem with Offset Pagination

\`\`\`sql
-- This gets slower as offset increases
SELECT * FROM posts
ORDER BY created_at DESC
OFFSET 100000 LIMIT 20;  -- Database must scan 100,000+ rows
\`\`\`

## Keyset Pagination Solution

\`\`\`sql
-- First page (no cursor)
SELECT id, title, created_at
FROM posts
ORDER BY created_at DESC, id DESC
LIMIT 20;

-- Subsequent pages (using cursor)
SELECT id, title, created_at
FROM posts
WHERE (created_at, id) < ('2024-12-19T10:30:00', 'post-xyz')
ORDER BY created_at DESC, id DESC
LIMIT 20;
\`\`\`

## TypeScript Implementation

\`\`\`typescript
interface PaginationCursor {
  createdAt: string;
  id: string;
}

async function getPosts(cursor?: PaginationCursor, limit = 20) {
  const query = cursor
    ? \`
        SELECT id, title, created_at
        FROM posts
        WHERE (created_at, id) < ($1, $2)
        ORDER BY created_at DESC, id DESC
        LIMIT $3
      \`
    : \`
        SELECT id, title, created_at
        FROM posts
        ORDER BY created_at DESC, id DESC
        LIMIT $1
      \`;

  const params = cursor
    ? [cursor.createdAt, cursor.id, limit]
    : [limit];

  const posts = await db.query(query, params);

  const nextCursor = posts.length === limit
    ? {
        createdAt: posts[posts.length - 1].created_at,
        id: posts[posts.length - 1].id,
      }
    : null;

  return { posts, nextCursor };
}
\`\`\`

## Key Benefits

| Approach | Performance | Use Case |
|----------|-------------|----------|
| Offset | O(n) - degrades | Small datasets, jump-to-page |
| Keyset | O(1) - constant | Large datasets, infinite scroll |

Would you like me to show how to handle this in your API response format?`,
      metadata: {
        model: 'claude-3-opus',
        tokenCount: 412,
        processingTimeMs: 2340,
      },
      createdAt: new Date('2024-12-20T10:06:00'),
    },
  ],
  'conv-2': [
    {
      id: 'msg-5',
      conversationId: 'conv-2',
      role: 'user',
      content: 'How should I structure React components for a large-scale application?',
      createdAt: new Date('2024-12-19T09:00:00'),
    },
    {
      id: 'msg-6',
      conversationId: 'conv-2',
      role: 'assistant',
      content: `For large-scale React applications, I recommend a feature-based architecture with clear separation of concerns. Here's a proven structure:

## Recommended Folder Structure

\`\`\`
src/
├── features/           # Feature modules
│   ├── auth/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── api/
│   │   └── index.ts
│   └── dashboard/
├── components/         # Shared components
│   ├── ui/            # Base UI components
│   └── layout/        # Layout components
├── hooks/             # Shared hooks
├── lib/               # Utilities
├── stores/            # Global state
└── types/             # TypeScript types
\`\`\`

## Component Design Principles

1. **Single Responsibility** - Each component does one thing well
2. **Composition** - Build complex UIs from simple components
3. **Colocation** - Keep related code together

Would you like me to elaborate on any of these patterns?`,
      metadata: {
        model: 'claude-3-opus',
        tokenCount: 198,
        processingTimeMs: 1560,
      },
      createdAt: new Date('2024-12-19T09:01:00'),
    },
  ],
}

// Mock prompt categories
export const mockPromptCategories: PromptCategory[] = [
  { id: 'writing', name: 'Writing', icon: 'pen-tool', color: '#3b82f6', promptCount: 8 },
  { id: 'coding', name: 'Coding', icon: 'code', color: '#22c55e', promptCount: 12 },
  { id: 'analysis', name: 'Analysis', icon: 'bar-chart-2', color: '#f59e0b', promptCount: 5 },
  { id: 'creative', name: 'Creative', icon: 'sparkles', color: '#ec4899', promptCount: 6 },
  { id: 'business', name: 'Business', icon: 'briefcase', color: '#6366f1', promptCount: 4 },
]

// Mock prompts
export const mockPrompts: Prompt[] = [
  {
    id: 'prompt-1',
    title: 'Code Review Assistant',
    description: 'Analyze code for bugs, performance issues, and best practices',
    content: `Please review the following {{language}} code and provide feedback on:

1. **Bugs & Issues**: Identify any bugs or potential runtime errors
2. **Performance**: Suggest performance optimizations
3. **Best Practices**: Point out deviations from {{language}} best practices
4. **Security**: Flag any security concerns
5. **Readability**: Suggest improvements for code clarity

Code to review:
\`\`\`{{language}}
{{code}}
\`\`\`

Please provide specific, actionable suggestions with code examples where helpful.`,
    variables: [
      { name: 'language', description: 'Programming language', defaultValue: 'TypeScript', required: true },
      { name: 'code', description: 'The code to review', required: true },
    ],
    categoryId: 'coding',
    tags: ['code-review', 'best-practices', 'debugging'],
    visibility: 'workspace',
    workspaceId: 'ws-1',
    userId: 'user-1',
    usageCount: 47,
    isFavorite: true,
    createdAt: new Date('2024-06-15'),
    updatedAt: new Date('2024-12-10'),
  },
  {
    id: 'prompt-2',
    title: 'Technical Documentation',
    description: 'Generate clear technical documentation for code or APIs',
    content: `Create comprehensive documentation for the following {{type}}:

{{content}}

Please include:
- Overview and purpose
- Installation/setup instructions (if applicable)
- Usage examples with code snippets
- API reference (parameters, return values, errors)
- Best practices and common patterns

Format the output in Markdown.`,
    variables: [
      { name: 'type', description: 'Type of documentation (function, API, module)', defaultValue: 'function', required: true },
      { name: 'content', description: 'The code or API to document', required: true },
    ],
    categoryId: 'writing',
    tags: ['documentation', 'technical-writing', 'markdown'],
    visibility: 'workspace',
    workspaceId: 'ws-1',
    userId: 'user-2',
    usageCount: 32,
    isFavorite: true,
    createdAt: new Date('2024-07-20'),
    updatedAt: new Date('2024-11-28'),
  },
  {
    id: 'prompt-3',
    title: 'SQL Query Builder',
    description: 'Generate optimized SQL queries from natural language',
    content: `Based on the following database schema:

{{schema}}

Generate an optimized {{database}} SQL query to: {{task}}

Requirements:
- Use appropriate indexes
- Include comments explaining the query
- Suggest any schema improvements if relevant
- Show EXPLAIN ANALYZE expectations`,
    variables: [
      { name: 'database', description: 'Database type', defaultValue: 'PostgreSQL', required: true },
      { name: 'schema', description: 'Database schema description', required: true },
      { name: 'task', description: 'What you want to query', required: true },
    ],
    categoryId: 'coding',
    tags: ['sql', 'database', 'optimization'],
    visibility: 'public',
    userId: 'user-1',
    usageCount: 89,
    isFavorite: false,
    createdAt: new Date('2024-05-10'),
    updatedAt: new Date('2024-12-15'),
  },
  {
    id: 'prompt-4',
    title: 'Blog Post Outline',
    description: 'Create structured outlines for blog posts',
    content: `Create a detailed blog post outline for the following topic:

Topic: {{topic}}
Target audience: {{audience}}
Desired length: {{length}} words
Tone: {{tone}}

Include:
- Compelling headline options (3)
- Introduction hook
- Main sections with key points
- Supporting examples or data to research
- Call-to-action suggestions
- SEO keyword recommendations`,
    variables: [
      { name: 'topic', description: 'Blog post topic', required: true },
      { name: 'audience', description: 'Target reader', defaultValue: 'Technical professionals', required: true },
      { name: 'length', description: 'Approximate word count', defaultValue: '1500', required: false },
      { name: 'tone', description: 'Writing tone', defaultValue: 'Professional yet approachable', required: false },
    ],
    categoryId: 'writing',
    tags: ['blog', 'content', 'seo'],
    visibility: 'workspace',
    workspaceId: 'ws-2',
    userId: 'user-2',
    usageCount: 24,
    isFavorite: false,
    createdAt: new Date('2024-08-05'),
    updatedAt: new Date('2024-12-01'),
  },
  {
    id: 'prompt-5',
    title: 'Data Analysis Summary',
    description: 'Summarize and interpret data analysis results',
    content: `Analyze the following data and provide insights:

{{data}}

Please provide:
1. **Executive Summary**: Key findings in 2-3 sentences
2. **Detailed Analysis**: Breakdown of important metrics
3. **Trends**: Notable patterns or trends
4. **Recommendations**: Actionable suggestions based on the data
5. **Caveats**: Any limitations or considerations

Format for {{audience}} audience.`,
    variables: [
      { name: 'data', description: 'Data to analyze (can be text, JSON, or description)', required: true },
      { name: 'audience', description: 'Target audience', defaultValue: 'executive', required: false },
    ],
    categoryId: 'analysis',
    tags: ['data', 'analytics', 'insights'],
    visibility: 'public',
    userId: 'user-3',
    usageCount: 56,
    isFavorite: true,
    createdAt: new Date('2024-04-22'),
    updatedAt: new Date('2024-11-15'),
  },
]

// AI response simulation chunks
export const mockAIResponses = [
  "I'll help you with that. ",
  "Let me think about this carefully.\n\n",
  "Here's what I suggest:\n\n",
  "## Key Points\n\n",
  "1. **First**, consider the overall structure\n",
  "2. **Second**, focus on the implementation details\n",
  "3. **Third**, test thoroughly\n\n",
  "Would you like me to elaborate on any of these points?",
]

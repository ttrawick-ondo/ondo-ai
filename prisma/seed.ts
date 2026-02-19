/**
 * Database Seed Script
 *
 * Populates the database with initial data for development.
 * Run with: npm run db:seed
 */

import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required')
}

const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Seeding database...')

  // Create default user with predictable ID for development
  const user = await prisma.user.upsert({
    where: { email: 'demo@ondo.ai' },
    update: {},
    create: {
      id: 'user-1', // Predictable ID for development
      email: 'demo@ondo.ai',
      name: 'Demo User',
      role: 'admin',
      settings: JSON.stringify({
        theme: 'system',
        defaultModel: 'gpt-4o',
        defaultProvider: 'openai',
        notifications: {
          email: true,
          push: false,
        },
      }),
    },
  })

  console.log(`Created user: ${user.email}`)

  // Create default workspace with predictable ID for development
  const workspace = await prisma.workspace.upsert({
    where: { slug: 'default' },
    update: {},
    create: {
      id: 'default', // Predictable ID for development
      name: 'Default Workspace',
      description: 'Your personal workspace',
      slug: 'default',
      ownerId: user.id,
      settings: JSON.stringify({
        defaultModel: 'gpt-4o',
        allowedProviders: ['openai', 'anthropic'],
      }),
    },
  })

  console.log(`Created workspace: ${workspace.name}`)

  // Add user as workspace member
  await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: user.id,
      },
    },
    update: {},
    create: {
      workspaceId: workspace.id,
      userId: user.id,
      role: 'owner',
    },
  })

  // Create sample projects
  const projects = [
    {
      name: 'AI Assistant',
      description: 'Building an intelligent AI assistant',
      color: '#6366f1',
      icon: 'brain',
    },
    {
      name: 'Code Review',
      description: 'Automated code review and analysis',
      color: '#22c55e',
      icon: 'code',
    },
    {
      name: 'Documentation',
      description: 'Technical documentation generation',
      color: '#f59e0b',
      icon: 'book',
    },
  ]

  for (const projectData of projects) {
    const project = await prisma.project.upsert({
      where: {
        id: `project-${projectData.name.toLowerCase().replace(/\s+/g, '-')}`,
      },
      update: {},
      create: {
        id: `project-${projectData.name.toLowerCase().replace(/\s+/g, '-')}`,
        workspaceId: workspace.id,
        ownerId: user.id,
        ...projectData,
        settings: JSON.stringify({
          defaultModel: 'gpt-4o',
          systemPrompt: `You are helping with the ${projectData.name} project.`,
        }),
      },
    })

    console.log(`Created project: ${project.name}`)
  }

  // Create sample prompts
  const prompts = [
    {
      name: 'Code Review',
      description: 'Review code for best practices and issues',
      content: `Please review the following code and provide feedback on:
1. Code quality and best practices
2. Potential bugs or issues
3. Performance considerations
4. Security concerns
5. Suggestions for improvement

Code to review:
{{code}}`,
      variables: JSON.stringify([
        { name: 'code', type: 'textarea', description: 'The code to review' },
      ]),
      category: 'Development',
      tags: JSON.stringify(['code-review', 'development', 'quality']),
    },
    {
      name: 'Explain Code',
      description: 'Get a detailed explanation of code',
      content: `Please explain the following {{language}} code in detail:

\`\`\`{{language}}
{{code}}
\`\`\`

Provide:
1. A high-level overview
2. Line-by-line explanation
3. Key concepts used
4. Potential use cases`,
      variables: JSON.stringify([
        { name: 'language', type: 'text', defaultValue: 'typescript' },
        { name: 'code', type: 'textarea', description: 'The code to explain' },
      ]),
      category: 'Development',
      tags: JSON.stringify(['explain', 'education', 'code']),
    },
    {
      name: 'Write Unit Tests',
      description: 'Generate unit tests for code',
      content: `Write comprehensive unit tests for the following {{language}} code using {{framework}}:

\`\`\`{{language}}
{{code}}
\`\`\`

Requirements:
- Cover all functions and methods
- Include edge cases
- Test error handling
- Aim for high code coverage`,
      variables: JSON.stringify([
        { name: 'language', type: 'text', defaultValue: 'typescript' },
        { name: 'framework', type: 'text', defaultValue: 'vitest' },
        { name: 'code', type: 'textarea', description: 'The code to test' },
      ]),
      category: 'Testing',
      tags: JSON.stringify(['testing', 'unit-tests', 'development']),
    },
    {
      name: 'Technical Documentation',
      description: 'Generate technical documentation',
      content: `Generate comprehensive technical documentation for:

{{subject}}

Include:
1. Overview and purpose
2. Architecture/design
3. API reference (if applicable)
4. Usage examples
5. Configuration options
6. Troubleshooting guide`,
      variables: JSON.stringify([
        { name: 'subject', type: 'textarea', description: 'What to document' },
      ]),
      category: 'Documentation',
      tags: JSON.stringify(['documentation', 'technical-writing']),
    },
  ]

  for (const promptData of prompts) {
    const prompt = await prisma.prompt.upsert({
      where: {
        id: `prompt-${promptData.name.toLowerCase().replace(/\s+/g, '-')}`,
      },
      update: {},
      create: {
        id: `prompt-${promptData.name.toLowerCase().replace(/\s+/g, '-')}`,
        workspaceId: workspace.id,
        userId: user.id,
        ...promptData,
        isPublic: true,
      },
    })

    console.log(`Created prompt: ${prompt.name}`)
  }

  // Create a sample conversation
  const conversation = await prisma.conversation.upsert({
    where: { id: 'sample-conversation' },
    update: {},
    create: {
      id: 'sample-conversation',
      userId: user.id,
      title: 'Welcome Conversation',
      model: 'gpt-4o',
      provider: 'openai',
      systemPrompt: 'You are a helpful AI assistant.',
    },
  })

  console.log(`Created conversation: ${conversation.title}`)

  // Add sample messages
  const existingMsg = await prisma.message.findUnique({ where: { id: 'msg-1' } })
  if (!existingMsg) {
    await prisma.message.createMany({
      data: [
        {
          id: 'msg-1',
          conversationId: conversation.id,
          userId: user.id,
          role: 'user',
          content: 'Hello! Can you help me understand how to use this AI chat application?',
        },
        {
          id: 'msg-2',
          conversationId: conversation.id,
          role: 'assistant',
          content: `Of course! Welcome to Ondo AI. Here's a quick overview of the features:

1. **Multi-Provider Support**: Chat with different AI models (OpenAI, Anthropic, etc.)
2. **Projects**: Organize your conversations by project
3. **Prompt Templates**: Use pre-built prompts for common tasks
4. **Tool Integration**: AI can use tools like web search and calculations
5. **File Attachments**: Upload code or documents for analysis

Is there anything specific you'd like to know more about?`,
          model: 'gpt-4o',
          provider: 'openai',
          inputTokens: 50,
          outputTokens: 120,
        },
      ],
    })
  }

  console.log('Created sample messages')

  console.log('\nDatabase seeded successfully!')
  console.log('\nLogin credentials:')
  console.log('  Email: demo@ondo.ai')
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

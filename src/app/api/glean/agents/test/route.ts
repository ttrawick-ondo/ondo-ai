import { NextRequest, NextResponse } from 'next/server'
import type { AgentPreviewConfig, GleanCitation } from '@/types'
import { requireSession, unauthorizedResponse } from '@/lib/auth/session'

// Mock response for development
const MOCK_CITATIONS: GleanCitation[] = [
  {
    id: 'citation-1',
    title: 'Engineering Best Practices Guide',
    url: 'https://docs.example.com/engineering/best-practices',
    snippet: 'This document outlines the recommended practices for code review, testing, and deployment...',
    source: 'Confluence',
    sourceType: 'confluence',
  },
  {
    id: 'citation-2',
    title: '#eng-announcements - New CI Pipeline',
    url: 'https://slack.example.com/archives/123',
    snippet: 'We have deployed a new CI pipeline that improves build times by 40%...',
    source: 'Slack',
    sourceType: 'slack',
  },
]

interface TestAgentRequest {
  config: AgentPreviewConfig
  query: string
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession()
    if (!session) return unauthorizedResponse()

    const body: TestAgentRequest = await request.json()

    const { config, query } = body

    if (!query || !query.trim()) {
      return NextResponse.json(
        { message: 'Query is required' },
        { status: 400 }
      )
    }

    if (!config.systemPrompt) {
      return NextResponse.json(
        { message: 'System prompt is required' },
        { status: 400 }
      )
    }

    // Check if Glean API is configured
    const apiKey = process.env.GLEAN_API_KEY
    const apiUrl = process.env.GLEAN_API_URL

    if (!apiKey || !apiUrl) {
      // Return mock response for development
      await new Promise((resolve) => setTimeout(resolve, 1000)) // Simulate latency

      const mockResponse = generateMockResponse(config, query)

      return NextResponse.json({
        response: mockResponse,
        citations: MOCK_CITATIONS.slice(0, Math.floor(Math.random() * 3)),
        isMock: true,
      })
    }

    // Call Glean API with draft agent config
    const baseUrl = apiUrl.replace(/\/+$/, '')
    const gleanResponse = await fetch(`${baseUrl}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: query },
        ],
        systemPrompt: config.systemPrompt,
        temperature: config.temperature,
        dataSources: config.dataSourceIds,
        // Flag that this is a test/preview request
        preview: true,
      }),
    })

    if (!gleanResponse.ok) {
      console.error('Glean API error:', await gleanResponse.text())
      return NextResponse.json(
        { message: 'Failed to test agent' },
        { status: gleanResponse.status }
      )
    }

    const data = await gleanResponse.json()

    return NextResponse.json({
      response: data.message?.content || data.content || '',
      citations: data.citations?.map((c: Record<string, unknown>, i: number) => ({
        id: `citation-${i}`,
        title: c.title || 'Untitled',
        url: c.url || '#',
        snippet: c.snippet || c.excerpt || '',
        source: c.source || 'Unknown',
        sourceType: c.sourceType || 'custom',
      })) || [],
    })
  } catch (error) {
    console.error('Agent test error:', error)
    return NextResponse.json(
      { message: 'Test failed' },
      { status: 500 }
    )
  }
}

function generateMockResponse(config: AgentPreviewConfig, query: string): string {
  const responses = [
    `Based on the internal documentation, here's what I found about "${query}":\n\n` +
    `The engineering team has established clear guidelines for this topic. ` +
    `According to our best practices documentation, the recommended approach involves careful consideration of performance, security, and maintainability.\n\n` +
    `Key points:\n` +
    `1. Follow the established code review process\n` +
    `2. Ensure proper test coverage (minimum 80%)\n` +
    `3. Document any changes to public APIs\n\n` +
    `For more details, please refer to the sources below.`,

    `I searched through ${config.dataSourceIds.length || 'all available'} data sources and found relevant information about "${query}":\n\n` +
    `This topic is covered in several internal documents. The most relevant information comes from our team's knowledge base and recent discussions.\n\n` +
    `Summary:\n` +
    `- The current approach is well-documented in Confluence\n` +
    `- Recent updates were discussed in Slack\n` +
    `- Consider checking the linked resources for implementation details`,

    `Here's what I found regarding "${query}":\n\n` +
    `Based on the available documentation and team discussions, this is a common question that has been addressed in multiple places.\n\n` +
    `The recommended solution involves:\n` +
    `• Reviewing the existing documentation\n` +
    `• Following established patterns\n` +
    `• Consulting with the team for edge cases\n\n` +
    `Please see the citations below for specific references.`,
  ]

  return responses[Math.floor(Math.random() * responses.length)]
}

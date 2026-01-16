'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, RotateCcw, Trash2, ExternalLink, Clock, FlaskConical } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import type { AgentPreviewConfig, AgentTestResult, GleanCitation } from '@/types'
import { gleanClient } from '@/lib/api/client'
import { generateId } from '@/lib/utils'

interface GleanAgentTestPanelProps {
  isOpen: boolean
  onClose: () => void
  config: AgentPreviewConfig
}

export function GleanAgentTestPanel({ isOpen, onClose, config }: GleanAgentTestPanelProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<AgentTestResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Scroll to bottom when new results come in
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [results])

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()

    if (!query.trim() || isLoading) return

    const currentQuery = query.trim()
    setQuery('')
    setIsLoading(true)
    setError(null)

    const startTime = Date.now()

    try {
      // Call the test API
      const response = await fetch('/api/glean/agents/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config,
          query: currentQuery,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Test failed' }))
        throw new Error(errorData.message || 'Test failed')
      }

      const data = await response.json()

      const result: AgentTestResult = {
        id: generateId(),
        query: currentQuery,
        response: data.response,
        citations: data.citations,
        processingTimeMs: Date.now() - startTime,
        timestamp: new Date(),
      }

      setResults((prev) => [...prev.slice(-4), result]) // Keep last 5 results
    } catch (err) {
      const errorResult: AgentTestResult = {
        id: generateId(),
        query: currentQuery,
        response: '',
        processingTimeMs: Date.now() - startTime,
        timestamp: new Date(),
        error: err instanceof Error ? err.message : 'Test failed',
      }
      setResults((prev) => [...prev.slice(-4), errorResult])
      setError(err instanceof Error ? err.message : 'Test failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRerun = (query: string) => {
    setQuery(query)
    // Submit after state update
    setTimeout(() => handleSubmit(), 0)
  }

  const handleClearHistory = () => {
    setResults([])
    setError(null)
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[500px] sm:w-[600px] flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5" />
            Test Agent
          </SheetTitle>
          <SheetDescription>
            Test your agent configuration before saving. Results are not stored.
          </SheetDescription>
        </SheetHeader>

        {/* Config Summary */}
        <div className="rounded-lg border bg-muted/50 p-3 mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-sm">{config.name || 'Untitled Agent'}</span>
            <Badge variant={config.isDraft ? 'secondary' : 'default'}>
              {config.isDraft ? 'Draft' : 'Saved'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {config.systemPrompt || 'No system prompt'}
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <span>Temp: {config.temperature.toFixed(1)}</span>
            <span>|</span>
            <span>{config.dataSourceIds.length} data source(s)</span>
          </div>
        </div>

        {/* Results Area */}
        <ScrollArea className="flex-1 mt-4" ref={scrollAreaRef}>
          <div className="space-y-4 pr-4">
            {results.length === 0 && !isLoading && (
              <div className="text-center py-8 text-muted-foreground">
                <FlaskConical className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Send a test query to see how your agent responds.</p>
              </div>
            )}

            {results.map((result) => (
              <TestResultCard
                key={result.id}
                result={result}
                onRerun={() => handleRerun(result.query)}
              />
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 p-4 rounded-lg bg-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Thinking...</span>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="mt-4 space-y-2">
          {results.length > 0 && (
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearHistory}
                className="text-xs"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Clear History
              </Button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type a test query..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" disabled={!query.trim() || isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  )
}

interface TestResultCardProps {
  result: AgentTestResult
  onRerun: () => void
}

function TestResultCard({ result, onRerun }: TestResultCardProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  return (
    <div className="rounded-lg border bg-background">
      {/* Query */}
      <div className="p-3 border-b bg-muted/30">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium">{result.query}</p>
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={onRerun}>
            <RotateCcw className="h-3 w-3" />
          </Button>
        </div>
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{result.processingTimeMs}ms</span>
          <span>|</span>
          <span>{result.timestamp.toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Response */}
      <div className="p-3">
        {result.error ? (
          <div className="text-sm text-destructive">
            Error: {result.error}
          </div>
        ) : (
          <>
            <p className="text-sm whitespace-pre-wrap">{result.response}</p>

            {/* Citations */}
            {result.citations && result.citations.length > 0 && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Sources ({result.citations.length})
                </p>
                <div className="space-y-2">
                  {result.citations.map((citation) => (
                    <CitationCard key={citation.id} citation={citation} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

interface CitationCardProps {
  citation: GleanCitation
}

function CitationCard({ citation }: CitationCardProps) {
  return (
    <a
      href={citation.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-md border p-2 hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate">{citation.title}</p>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {citation.snippet}
          </p>
        </div>
        <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
      </div>
      <div className="flex items-center gap-2 mt-1">
        <Badge variant="outline" className="text-xs h-5">
          {citation.sourceType}
        </Badge>
        <span className="text-xs text-muted-foreground">{citation.source}</span>
      </div>
    </a>
  )
}

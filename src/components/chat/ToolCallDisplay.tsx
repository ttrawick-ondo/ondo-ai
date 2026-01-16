'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Wrench, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { ToolCall, ToolExecutionRecord } from '@/types'

interface ToolCallDisplayProps {
  toolCalls: ToolCall[]
  executions?: ToolExecutionRecord[]
  isExecuting?: boolean
}

export function ToolCallDisplay({ toolCalls, executions, isExecuting }: ToolCallDisplayProps) {
  const [expandedCalls, setExpandedCalls] = useState<Set<string>>(new Set())

  const toggleExpand = (id: string) => {
    setExpandedCalls((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const getExecution = (toolCallId: string) => {
    return executions?.find((e) => e.id === toolCallId)
  }

  return (
    <div className="space-y-2 mt-2">
      {toolCalls.map((toolCall) => {
        const execution = getExecution(toolCall.id)
        const isExpanded = expandedCalls.has(toolCall.id)
        const isRunning = isExecuting && !execution

        let args: Record<string, unknown> = {}
        try {
          args = JSON.parse(toolCall.function.arguments)
        } catch {
          // Invalid JSON, keep empty object
        }

        return (
          <div
            key={toolCall.id}
            className="border rounded-lg bg-muted/50 overflow-hidden"
          >
            <Button
              variant="ghost"
              className="w-full justify-start p-3 h-auto"
              onClick={() => toggleExpand(toolCall.id)}
            >
              <div className="flex items-center gap-2 w-full">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0" />
                )}
                <Wrench className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="font-mono text-sm font-medium">
                  {toolCall.function.name}
                </span>
                <div className="flex-1" />
                {isRunning ? (
                  <Badge variant="secondary" className="gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Running
                  </Badge>
                ) : execution ? (
                  execution.result.success ? (
                    <Badge variant="secondary" className="gap-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      <CheckCircle2 className="h-3 w-3" />
                      Success
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="gap-1">
                      <XCircle className="h-3 w-3" />
                      Failed
                    </Badge>
                  )
                ) : null}
              </div>
            </Button>

            {isExpanded && (
              <div className="px-3 pb-3 space-y-3">
                {/* Arguments */}
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-1">
                    Arguments
                  </h4>
                  <pre className="text-xs bg-background rounded p-2 overflow-x-auto">
                    {JSON.stringify(args, null, 2)}
                  </pre>
                </div>

                {/* Result */}
                {execution && (
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-1">
                      Result
                    </h4>
                    <pre
                      className={cn(
                        'text-xs rounded p-2 overflow-x-auto',
                        execution.result.success
                          ? 'bg-background'
                          : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                      )}
                    >
                      {execution.result.success
                        ? execution.result.output
                        : execution.result.error || 'Unknown error'}
                    </pre>
                    {execution.duration && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Completed in {execution.duration}ms
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

interface ToolResultDisplayProps {
  toolCallId: string
  execution?: ToolExecutionRecord
}

export function ToolResultDisplay({ toolCallId, execution }: ToolResultDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (!execution) {
    return null
  }

  return (
    <div className="border rounded-lg bg-muted/30 overflow-hidden">
      <Button
        variant="ghost"
        className="w-full justify-start p-3 h-auto"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2 w-full">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0" />
          )}
          {execution.result.success ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
          ) : (
            <XCircle className="h-4 w-4 shrink-0 text-red-500" />
          )}
          <span className="font-mono text-sm font-medium">
            {execution.toolName}
          </span>
          <span className="text-xs text-muted-foreground">
            ({execution.duration}ms)
          </span>
        </div>
      </Button>

      {isExpanded && (
        <div className="px-3 pb-3">
          <pre
            className={cn(
              'text-xs rounded p-2 overflow-x-auto',
              execution.result.success
                ? 'bg-background'
                : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
            )}
          >
            {execution.result.success
              ? execution.result.output
              : execution.result.error || 'Unknown error'}
          </pre>
        </div>
      )}
    </div>
  )
}

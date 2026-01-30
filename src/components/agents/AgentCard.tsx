'use client'

import { MoreHorizontal, Pencil, FlaskConical, Trash2, Thermometer } from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { GleanAgentConfig } from '@/types'

const DATA_SOURCE_ICONS: Record<string, string> = {
  confluence: '📘',
  slack: '💬',
  github: '🐙',
  jira: '📋',
  gdrive: '📁',
  notion: '📝',
  custom: '🔧',
}

interface AgentCardProps {
  agent: GleanAgentConfig
  onEdit: () => void
  onTest: () => void
  onDelete: () => void
}

export function AgentCard({ agent, onEdit, onTest, onDelete }: AgentCardProps) {
  return (
    <Card className="group cursor-pointer transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base truncate">{agent.name}</CardTitle>
            {agent.description && (
              <CardDescription className="line-clamp-2 mt-1">
                {agent.description}
              </CardDescription>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit()
                }}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  onTest()
                }}
              >
                <FlaskConical className="h-4 w-4 mr-2" />
                Test
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete()
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        {/* Data Sources */}
        <div className="flex flex-wrap gap-1 mb-3">
          {agent.dataSources.slice(0, 4).map((ds) => (
            <Badge key={ds.id} variant="secondary" className="text-xs">
              <span className="mr-1">{DATA_SOURCE_ICONS[ds.type] || '📄'}</span>
              {ds.name}
            </Badge>
          ))}
          {agent.dataSources.length > 4 && (
            <Badge variant="secondary" className="text-xs">
              +{agent.dataSources.length - 4}
            </Badge>
          )}
          {agent.dataSources.length === 0 && (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              No data sources
            </Badge>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Thermometer className="h-3.5 w-3.5" />
            <span>{agent.temperature.toFixed(1)}</span>
          </div>
          <span>{formatRelativeTime(agent.updatedAt)}</span>
        </div>
      </CardContent>
    </Card>
  )
}

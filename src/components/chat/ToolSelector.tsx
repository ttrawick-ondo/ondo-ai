'use client'

import { useEffect } from 'react'
import { Wrench, ChevronDown, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip'
import { toolRegistry } from '@/lib/tools'
import { useEnabledTools, useChatActions } from '@/stores'

interface ToolSelectorProps {
  supportsTools?: boolean
  modelName?: string
}

export function ToolSelector({ supportsTools = true, modelName }: ToolSelectorProps) {
  const enabledTools = useEnabledTools()
  const { setEnabledTools } = useChatActions()
  const allTools = toolRegistry.getAllTools()

  // Clear enabled tools when switching to a model that doesn't support them
  useEffect(() => {
    if (!supportsTools && enabledTools.length > 0) {
      setEnabledTools([])
    }
  }, [supportsTools, enabledTools.length, setEnabledTools])

  const handleToggleTool = (toolName: string) => {
    if (enabledTools.includes(toolName)) {
      setEnabledTools(enabledTools.filter((t) => t !== toolName))
    } else {
      setEnabledTools([...enabledTools, toolName])
    }
  }

  const handleEnableAll = () => {
    setEnabledTools(allTools.map((t) => t.name))
  }

  const handleDisableAll = () => {
    setEnabledTools([])
  }

  // If tools not supported, show disabled button with tooltip
  if (!supportsTools) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 h-8 opacity-50 cursor-not-allowed"
              disabled
            >
              <Wrench className="h-4 w-4" />
              <span className="hidden sm:inline">Tools</span>
              <AlertCircle className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>{modelName || 'This model'} does not support function calling</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'gap-2 h-8',
            enabledTools.length > 0 && 'border-primary/50'
          )}
        >
          <Wrench className="h-4 w-4" />
          <span className="hidden sm:inline">Tools</span>
          {enabledTools.length > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-xs">
              {enabledTools.length}
            </Badge>
          )}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Available Tools</span>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={handleEnableAll}
            >
              Enable All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={handleDisableAll}
            >
              Disable All
            </Button>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {allTools.map((tool) => (
          <DropdownMenuCheckboxItem
            key={tool.name}
            checked={enabledTools.includes(tool.name)}
            onCheckedChange={() => handleToggleTool(tool.name)}
            className="flex flex-col items-start py-2"
          >
            <div className="flex items-center gap-2 w-full">
              <span className="font-mono text-sm font-medium">
                {tool.name}
              </span>
            </div>
            <span className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {tool.description}
            </span>
          </DropdownMenuCheckboxItem>
        ))}
        {allTools.length === 0 && (
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
            No tools available
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

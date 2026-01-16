'use client'

import { useState, useMemo } from 'react'
import { Library, Search, Star, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { usePrompts, useFavoritePrompts, usePromptActions } from '@/stores'
import type { Prompt } from '@/types'

interface PromptSelectorProps {
  onSelect: (content: string, variables?: Record<string, string>) => void
  disabled?: boolean
}

export function PromptSelector({ onSelect, disabled }: PromptSelectorProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'favorites' | 'recent'>('all')

  const allPrompts = usePrompts()
  const favoritePrompts = useFavoritePrompts()
  const { incrementUsage } = usePromptActions()

  // Sort prompts by usage count for "recent" tab
  const recentPrompts = useMemo(() => {
    return [...allPrompts]
      .filter(p => p.usageCount > 0)
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 10)
  }, [allPrompts])

  // Filter prompts based on search and active tab
  const filteredPrompts = useMemo(() => {
    let prompts: Prompt[]

    switch (activeTab) {
      case 'favorites':
        prompts = favoritePrompts
        break
      case 'recent':
        prompts = recentPrompts
        break
      default:
        prompts = allPrompts
    }

    if (!search.trim()) return prompts

    const query = search.toLowerCase()
    return prompts.filter(
      p =>
        p.title.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query) ||
        p.tags.some(t => t.toLowerCase().includes(query))
    )
  }, [allPrompts, favoritePrompts, recentPrompts, activeTab, search])

  const handleSelect = (prompt: Prompt) => {
    // Check if prompt has variables that need to be filled
    if (prompt.variables && prompt.variables.length > 0) {
      // For now, just insert the content with variable placeholders
      // A more advanced implementation would show a dialog to fill variables
      onSelect(prompt.content)
    } else {
      onSelect(prompt.content)
    }

    incrementUsage(prompt.id)
    setOpen(false)
    setSearch('')
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0"
                disabled={disabled}
              >
                <Library className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="top">Use prompt template</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search prompts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9"
            />
          </div>

          <div className="flex gap-1 mt-2">
            <TabButton
              active={activeTab === 'all'}
              onClick={() => setActiveTab('all')}
            >
              All
            </TabButton>
            <TabButton
              active={activeTab === 'favorites'}
              onClick={() => setActiveTab('favorites')}
              icon={<Star className="h-3 w-3" />}
            >
              Favorites
            </TabButton>
            <TabButton
              active={activeTab === 'recent'}
              onClick={() => setActiveTab('recent')}
              icon={<Clock className="h-3 w-3" />}
            >
              Recent
            </TabButton>
          </div>
        </div>

        <ScrollArea className="h-64">
          {filteredPrompts.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {search ? 'No prompts found' : 'No prompts available'}
            </div>
          ) : (
            <div className="p-2">
              {filteredPrompts.map((prompt) => (
                <PromptItem
                  key={prompt.id}
                  prompt={prompt}
                  onClick={() => handleSelect(prompt)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}

interface TabButtonProps {
  active: boolean
  onClick: () => void
  icon?: React.ReactNode
  children: React.ReactNode
}

function TabButton({ active, onClick, icon, children }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors',
        active
          ? 'bg-secondary text-secondary-foreground'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
      )}
    >
      {icon}
      {children}
    </button>
  )
}

interface PromptItemProps {
  prompt: Prompt
  onClick: () => void
}

function PromptItem({ prompt, onClick }: PromptItemProps) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-2 rounded-md hover:bg-muted transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-sm truncate">{prompt.title}</span>
            {prompt.isFavorite && (
              <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 shrink-0" />
            )}
          </div>
          {prompt.description && (
            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
              {prompt.description}
            </p>
          )}
        </div>
        {prompt.variables && prompt.variables.length > 0 && (
          <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded shrink-0">
            {prompt.variables.length} var{prompt.variables.length > 1 ? 's' : ''}
          </span>
        )}
      </div>
      {prompt.tags.length > 0 && (
        <div className="flex gap-1 mt-1.5 flex-wrap">
          {prompt.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </button>
  )
}

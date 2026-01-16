'use client'

import { useState, useMemo } from 'react'
import { Library, Search, Star, Clock, X, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { usePrompts, useFavoritePrompts, usePromptActions } from '@/stores'
import type { Prompt, PromptVariable } from '@/types'

interface PromptSelectorProps {
  onSelect: (content: string, promptName: string) => void
  disabled?: boolean
}

export function PromptSelector({ onSelect, disabled }: PromptSelectorProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'favorites' | 'recent'>('all')
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null)
  const [variableValues, setVariableValues] = useState<Record<string, string>>({})
  const [editedContent, setEditedContent] = useState('')

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

  const handlePromptClick = (prompt: Prompt) => {
    setSelectedPrompt(prompt)
    setEditedContent(prompt.content)
    // Initialize variable values
    const initialValues: Record<string, string> = {}
    prompt.variables?.forEach(v => {
      initialValues[v.name] = v.defaultValue || ''
    })
    setVariableValues(initialValues)
    setOpen(false)
  }

  const handleUsePrompt = () => {
    if (!selectedPrompt) return

    // Replace variables in content
    let finalContent = editedContent
    selectedPrompt.variables?.forEach(v => {
      const value = variableValues[v.name] || v.defaultValue || `{{${v.name}}}`
      finalContent = finalContent.replace(new RegExp(`{{${v.name}}}`, 'g'), value)
    })

    onSelect(finalContent, selectedPrompt.title)
    incrementUsage(selectedPrompt.id)
    closePreview()
  }

  const closePreview = () => {
    setSelectedPrompt(null)
    setVariableValues({})
    setEditedContent('')
  }

  const hasVariables = selectedPrompt?.variables && selectedPrompt.variables.length > 0

  return (
    <>
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
                    onClick={() => handlePromptClick(prompt)}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>

      {/* Preview/Compose Dialog */}
      <Dialog open={!!selectedPrompt} onOpenChange={(open) => !open && closePreview()}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Library className="h-5 w-5" />
              {selectedPrompt?.title}
            </DialogTitle>
            {selectedPrompt?.description && (
              <DialogDescription>{selectedPrompt.description}</DialogDescription>
            )}
          </DialogHeader>

          <div className="flex-1 space-y-4 overflow-y-auto py-4">
            {/* Variables */}
            {hasVariables && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Fill in variables</h4>
                <div className="grid gap-3">
                  {selectedPrompt?.variables?.map((variable) => (
                    <VariableInput
                      key={variable.name}
                      variable={variable}
                      value={variableValues[variable.name] || ''}
                      onChange={(value) =>
                        setVariableValues((prev) => ({ ...prev, [variable.name]: value }))
                      }
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Content preview/edit */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">
                  {hasVariables ? 'Template content' : 'Content'}
                </h4>
                <span className="text-xs text-muted-foreground">
                  You can edit before using
                </span>
              </div>
              <Textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="min-h-[200px] font-mono text-sm"
                placeholder="Prompt content..."
              />
            </div>

            {/* Tags */}
            {selectedPrompt?.tags && selectedPrompt.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedPrompt.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs bg-muted px-2 py-0.5 rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closePreview}>
              Cancel
            </Button>
            <Button onClick={handleUsePrompt}>
              <ArrowRight className="h-4 w-4 mr-2" />
              Use Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
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

interface VariableInputProps {
  variable: PromptVariable
  value: string
  onChange: (value: string) => void
}

function VariableInput({ variable, value, onChange }: VariableInputProps) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium flex items-center gap-2">
        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{`{{${variable.name}}}`}</code>
        {variable.required && <span className="text-destructive">*</span>}
      </label>
      {variable.description && (
        <p className="text-xs text-muted-foreground">{variable.description}</p>
      )}
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={variable.defaultValue || `Enter ${variable.name}...`}
      />
    </div>
  )
}

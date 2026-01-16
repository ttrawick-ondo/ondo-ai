'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, Plus, Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { ModelIcon } from './ModelIcon'
import {
  useModels,
  useModelActions,
  useModelLoading,
  useGleanAgents,
  useUIActions,
} from '@/stores'
import type { ModelConfig, AIProvider, GleanAgentConfig } from '@/types'

interface ModelSelectorProps {
  selectedModelId: string | null
  onModelSelect: (modelId: string) => void
  workspaceId?: string
  compact?: boolean
  disabled?: boolean
}

const providerOrder: AIProvider[] = ['anthropic', 'openai', 'glean', 'dust', 'ondobot']

const providerLabels: Record<AIProvider, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  glean: 'Glean',
  dust: 'Dust',
  ondobot: 'OndoBot',
}

export function ModelSelector({
  selectedModelId,
  onModelSelect,
  workspaceId,
  compact = false,
  disabled = false,
}: ModelSelectorProps) {
  const [open, setOpen] = useState(false)
  const models = useModels()
  const isLoading = useModelLoading()
  const { loadModels, loadGleanAgents } = useModelActions()
  const gleanAgents = useGleanAgents(workspaceId || '')
  const { openModal } = useUIActions()

  useEffect(() => {
    if (models.length === 0) {
      loadModels()
    }
  }, [models.length, loadModels])

  useEffect(() => {
    if (workspaceId) {
      loadGleanAgents(workspaceId)
    }
  }, [workspaceId, loadGleanAgents])

  const selectedModel = models.find((m) => m.id === selectedModelId)

  // Group models by provider
  const modelsByProvider = models.reduce((acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = []
    }
    acc[model.provider].push(model)
    return acc
  }, {} as Record<AIProvider, ModelConfig[]>)

  const handleSelect = (modelId: string) => {
    onModelSelect(modelId)
    setOpen(false)
  }

  const handleCreateGleanAgent = () => {
    setOpen(false)
    openModal('create-glean-agent')
  }

  if (compact) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 px-2"
            disabled={disabled || isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : selectedModel ? (
              <>
                <ModelIcon provider={selectedModel.provider} size="sm" />
                <span className="max-w-[100px] truncate text-xs">
                  {selectedModel.name}
                </span>
              </>
            ) : (
              <span className="text-xs text-muted-foreground">Select model</span>
            )}
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0" align="start">
          <ModelSelectorContent
            models={models}
            modelsByProvider={modelsByProvider}
            selectedModelId={selectedModelId}
            gleanAgents={gleanAgents}
            onSelect={handleSelect}
            onCreateGleanAgent={handleCreateGleanAgent}
          />
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled || isLoading}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading models...
            </span>
          ) : selectedModel ? (
            <span className="flex items-center gap-2">
              <ModelIcon provider={selectedModel.provider} />
              {selectedModel.name}
            </span>
          ) : (
            <span className="text-muted-foreground">Select a model...</span>
          )}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0">
        <ModelSelectorContent
          models={models}
          modelsByProvider={modelsByProvider}
          selectedModelId={selectedModelId}
          gleanAgents={gleanAgents}
          onSelect={handleSelect}
          onCreateGleanAgent={handleCreateGleanAgent}
        />
      </PopoverContent>
    </Popover>
  )
}

interface ModelSelectorContentProps {
  models: ModelConfig[]
  modelsByProvider: Record<AIProvider, ModelConfig[]>
  selectedModelId: string | null
  gleanAgents: GleanAgentConfig[]
  onSelect: (modelId: string) => void
  onCreateGleanAgent: () => void
}

function ModelSelectorContent({
  modelsByProvider,
  selectedModelId,
  gleanAgents,
  onSelect,
  onCreateGleanAgent,
}: ModelSelectorContentProps) {
  return (
    <Command>
      <CommandInput placeholder="Search models..." />
      <CommandList>
        <CommandEmpty>No models found.</CommandEmpty>

        {providerOrder.map((provider) => {
          const providerModels = modelsByProvider[provider]
          if (!providerModels || providerModels.length === 0) return null

          return (
            <CommandGroup key={provider} heading={providerLabels[provider]}>
              {providerModels.map((model) => (
                <CommandItem
                  key={model.id}
                  value={model.id}
                  onSelect={() => onSelect(model.id)}
                  className="flex items-center gap-2"
                >
                  <ModelIcon provider={model.provider} size="sm" />
                  <div className="flex flex-1 flex-col">
                    <span className="text-sm">{model.name}</span>
                    {model.description && (
                      <span className="text-xs text-muted-foreground">
                        {model.description}
                      </span>
                    )}
                  </div>
                  {selectedModelId === model.id && (
                    <Check className="h-4 w-4" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          )
        })}

        {/* Glean Agents Section */}
        {gleanAgents.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Glean Agents">
              {gleanAgents.map((agent) => (
                <CommandItem
                  key={agent.id}
                  value={`glean-agent-${agent.id}`}
                  onSelect={() => onSelect(`glean-agent-${agent.id}`)}
                  className="flex items-center gap-2"
                >
                  <ModelIcon provider="glean" size="sm" />
                  <div className="flex flex-1 flex-col">
                    <span className="text-sm">{agent.name}</span>
                    {agent.description && (
                      <span className="text-xs text-muted-foreground">
                        {agent.description}
                      </span>
                    )}
                  </div>
                  {selectedModelId === `glean-agent-${agent.id}` && (
                    <Check className="h-4 w-4" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Create Glean Agent Option */}
        <CommandSeparator />
        <CommandGroup>
          <CommandItem
            onSelect={onCreateGleanAgent}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>Create Glean Agent</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  )
}

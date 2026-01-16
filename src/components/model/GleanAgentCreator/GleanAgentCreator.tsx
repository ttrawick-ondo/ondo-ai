'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  useActiveModal,
  useUIActions,
  useModelActions,
  useGleanDataSources,
  useActiveWorkspace,
} from '@/stores'
import type { GleanDataSource } from '@/types'

export function GleanAgentCreator() {
  const activeModal = useActiveModal()
  const { closeModal } = useUIActions()
  const { createGleanAgent, loadGleanDataSources } = useModelActions()
  const dataSources = useGleanDataSources()
  const workspace = useActiveWorkspace()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [temperature, setTemperature] = useState(0.7)
  const [selectedDataSources, setSelectedDataSources] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isOpen = activeModal === 'create-glean-agent'

  useEffect(() => {
    if (isOpen) {
      loadGleanDataSources()
    }
  }, [isOpen, loadGleanDataSources])

  const handleDataSourceToggle = (dataSourceId: string) => {
    setSelectedDataSources((prev) =>
      prev.includes(dataSourceId)
        ? prev.filter((id) => id !== dataSourceId)
        : [...prev, dataSourceId]
    )
  }

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Name is required')
      return
    }

    if (!systemPrompt.trim()) {
      setError('System prompt is required')
      return
    }

    if (!workspace) {
      setError('No workspace selected')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await createGleanAgent(workspace.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        systemPrompt: systemPrompt.trim(),
        dataSourceIds: selectedDataSources,
        temperature,
      })

      // Reset form and close modal
      setName('')
      setDescription('')
      setSystemPrompt('')
      setTemperature(0.7)
      setSelectedDataSources([])
      closeModal()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create agent')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      closeModal()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Glean Agent</DialogTitle>
          <DialogDescription>
            Create a custom Glean agent with specific data sources and behavior.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Name
            </label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Engineering Docs Assistant"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              Description (optional)
            </label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of what this agent does"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="systemPrompt" className="text-sm font-medium">
              System Prompt
            </label>
            <Textarea
              id="systemPrompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="You are a helpful assistant that specializes in..."
              rows={4}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Temperature: {temperature.toFixed(1)}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full"
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              Lower values make responses more focused, higher values more creative.
            </p>
          </div>

          {dataSources.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Data Sources</label>
              <ScrollArea className="h-[150px] rounded-md border p-2">
                <div className="space-y-2">
                  {dataSources.map((ds) => (
                    <DataSourceItem
                      key={ds.id}
                      dataSource={ds}
                      isSelected={selectedDataSources.includes(ds.id)}
                      onToggle={() => handleDataSourceToggle(ds.id)}
                      disabled={isSubmitting}
                    />
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Agent
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface DataSourceItemProps {
  dataSource: GleanDataSource
  isSelected: boolean
  onToggle: () => void
  disabled: boolean
}

function DataSourceItem({
  dataSource,
  isSelected,
  onToggle,
  disabled,
}: DataSourceItemProps) {
  return (
    <div
      className="flex items-center justify-between rounded-md border p-2"
      onClick={disabled ? undefined : onToggle}
    >
      <div className="flex flex-col">
        <span className="text-sm font-medium">{dataSource.name}</span>
        <span className="text-xs text-muted-foreground capitalize">
          {dataSource.type}
        </span>
      </div>
      <Switch checked={isSelected} disabled={disabled} />
    </div>
  )
}

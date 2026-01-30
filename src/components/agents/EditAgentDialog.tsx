'use client'

import { useState, useEffect } from 'react'
import { Loader2, FlaskConical } from 'lucide-react'
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
import { GleanAgentTestPanel } from '@/components/model'
import { useModelActions, useGleanDataSources } from '@/stores'
import type { GleanAgentConfig, GleanDataSource, AgentPreviewConfig } from '@/types'

interface EditAgentDialogProps {
  agent: GleanAgentConfig | null
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
}

export function EditAgentDialog({ agent, isOpen, onClose, onSaved }: EditAgentDialogProps) {
  const { updateGleanAgent, loadGleanDataSources } = useModelActions()
  const dataSources = useGleanDataSources()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [temperature, setTemperature] = useState(0.7)
  const [selectedDataSources, setSelectedDataSources] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isTestPanelOpen, setIsTestPanelOpen] = useState(false)

  // Populate form when agent changes
  useEffect(() => {
    if (agent && isOpen) {
      setName(agent.name)
      setDescription(agent.description || '')
      setSystemPrompt(agent.systemPrompt)
      setTemperature(agent.temperature)
      setSelectedDataSources(agent.dataSources.map((ds) => ds.id))
      setError(null)
    }
  }, [agent, isOpen])

  // Load data sources when dialog opens
  useEffect(() => {
    if (isOpen) {
      loadGleanDataSources()
    }
  }, [isOpen, loadGleanDataSources])

  // Build preview config for testing
  const previewConfig: AgentPreviewConfig = {
    name: name.trim() || 'Untitled Agent',
    description: description.trim() || undefined,
    systemPrompt: systemPrompt.trim(),
    dataSourceIds: selectedDataSources,
    temperature,
    savedAgentId: agent?.id,
    isDraft: false,
  }

  const handleDataSourceToggle = (dataSourceId: string) => {
    setSelectedDataSources((prev) =>
      prev.includes(dataSourceId)
        ? prev.filter((id) => id !== dataSourceId)
        : [...prev, dataSourceId]
    )
  }

  const handleSubmit = async () => {
    if (!agent) return

    if (!name.trim()) {
      setError('Name is required')
      return
    }

    if (!systemPrompt.trim()) {
      setError('System prompt is required')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await updateGleanAgent(agent.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        systemPrompt: systemPrompt.trim(),
        dataSourceIds: selectedDataSources,
        temperature,
      })

      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update agent')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Agent</DialogTitle>
          <DialogDescription>
            Update your Glean agent configuration.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="edit-name" className="text-sm font-medium">
              Name
            </label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Engineering Docs Assistant"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="edit-description" className="text-sm font-medium">
              Description (optional)
            </label>
            <Input
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of what this agent does"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="edit-systemPrompt" className="text-sm font-medium">
              System Prompt
            </label>
            <Textarea
              id="edit-systemPrompt"
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

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => setIsTestPanelOpen(true)}
            disabled={isSubmitting || !systemPrompt.trim()}
            className="w-full sm:w-auto"
          >
            <FlaskConical className="mr-2 h-4 w-4" />
            Test Agent
          </Button>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={handleClose} disabled={isSubmitting} className="flex-1 sm:flex-none">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting} className="flex-1 sm:flex-none">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>

      {/* Test Panel */}
      <GleanAgentTestPanel
        isOpen={isTestPanelOpen}
        onClose={() => setIsTestPanelOpen(false)}
        config={previewConfig}
      />
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
      className="flex items-center justify-between rounded-md border p-2 cursor-pointer hover:bg-muted/50"
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

'use client'

import { useState, useEffect, useMemo } from 'react'
import { Plus, Search, Bot } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AgentCard, EditAgentDialog, DeleteAgentDialog } from '@/components/agents'
import { GleanAgentCreator, GleanAgentTestPanel } from '@/components/model'
import {
  useGleanAgents,
  useActiveWorkspace,
  useModelActions,
  useUIActions,
} from '@/stores'
import type { GleanAgentConfig, AgentPreviewConfig } from '@/types'

export default function AgentsPage() {
  const workspace = useActiveWorkspace()
  const agents = useGleanAgents(workspace?.id || '')
  const { loadGleanAgents } = useModelActions()
  const { openModal } = useUIActions()

  const [searchQuery, setSearchQuery] = useState('')
  const [editingAgent, setEditingAgent] = useState<GleanAgentConfig | null>(null)
  const [deletingAgent, setDeletingAgent] = useState<GleanAgentConfig | null>(null)
  const [testingConfig, setTestingConfig] = useState<AgentPreviewConfig | null>(null)

  // Load agents when workspace changes
  useEffect(() => {
    if (workspace?.id) {
      loadGleanAgents(workspace.id)
    }
  }, [workspace?.id, loadGleanAgents])

  // Filter agents by search query
  const filteredAgents = useMemo(() => {
    if (!searchQuery.trim()) return agents

    const query = searchQuery.toLowerCase()
    return agents.filter(
      (agent) =>
        agent.name.toLowerCase().includes(query) ||
        agent.description?.toLowerCase().includes(query)
    )
  }, [agents, searchQuery])

  const handleCreateAgent = () => {
    openModal('create-glean-agent')
  }

  const handleTestAgent = (agent: GleanAgentConfig) => {
    const config: AgentPreviewConfig = {
      name: agent.name,
      description: agent.description,
      systemPrompt: agent.systemPrompt,
      dataSourceIds: agent.dataSources.map((ds) => ds.id),
      temperature: agent.temperature,
      savedAgentId: agent.id,
      isDraft: false,
    }
    setTestingConfig(config)
  }

  const handleAgentUpdated = () => {
    if (workspace?.id) {
      loadGleanAgents(workspace.id)
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold">Agents</h1>
            <p className="text-muted-foreground">
              Manage your Glean agents for specialized knowledge retrieval
            </p>
          </div>
          <Button onClick={handleCreateAgent}>
            <Plus className="h-4 w-4 mr-2" />
            Create Agent
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search agents..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {filteredAgents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Bot className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-1">
              {searchQuery ? 'No agents found' : 'No agents yet'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery
                ? 'Try a different search term'
                : 'Create your first agent to get started with specialized knowledge retrieval'}
            </p>
            {!searchQuery && (
              <Button onClick={handleCreateAgent}>
                <Plus className="h-4 w-4 mr-2" />
                Create Agent
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredAgents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onEdit={() => setEditingAgent(agent)}
                onTest={() => handleTestAgent(agent)}
                onDelete={() => setDeletingAgent(agent)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <GleanAgentCreator />

      <EditAgentDialog
        agent={editingAgent}
        isOpen={!!editingAgent}
        onClose={() => setEditingAgent(null)}
        onSaved={handleAgentUpdated}
      />

      <DeleteAgentDialog
        agent={deletingAgent}
        isOpen={!!deletingAgent}
        onClose={() => setDeletingAgent(null)}
        onDeleted={handleAgentUpdated}
      />

      {testingConfig && (
        <GleanAgentTestPanel
          isOpen={!!testingConfig}
          onClose={() => setTestingConfig(null)}
          config={testingConfig}
        />
      )}
    </div>
  )
}

'use client'

import { ExternalLink, Sparkles } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  useActiveModal,
  useUIActions,
} from '@/stores'

// Glean Agent Builder URL - users create agents directly in Glean's UI
const GLEAN_AGENT_BUILDER_URL = 'https://app.glean.com/admin/platform/agents'

export function GleanAgentCreator() {
  const activeModal = useActiveModal()
  const { closeModal } = useUIActions()

  const isOpen = activeModal === 'create-glean-agent'

  const handleOpenGlean = () => {
    window.open(GLEAN_AGENT_BUILDER_URL, '_blank', 'noopener,noreferrer')
    closeModal()
  }

  const handleClose = () => {
    closeModal()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Create Glean Agent
          </DialogTitle>
          <DialogDescription>
            Glean Agents are created and managed in the Glean Admin Console.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
            <h4 className="font-medium text-sm">To create a Glean Agent:</h4>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Open the Glean Agent Builder</li>
              <li>Configure your agent&apos;s name and description</li>
              <li>Select data sources and permissions</li>
              <li>Set up the system prompt and behavior</li>
              <li>Test and publish your agent</li>
            </ol>
          </div>

          <p className="text-sm text-muted-foreground">
            Once created, your agent will automatically appear in Ondo AI&apos;s model
            selector when you refresh the page.
          </p>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button onClick={handleOpenGlean} className="w-full sm:w-auto">
            <ExternalLink className="mr-2 h-4 w-4" />
            Open Glean Agent Builder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

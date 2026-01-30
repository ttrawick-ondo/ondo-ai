'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useModelActions } from '@/stores'
import type { GleanAgentConfig } from '@/types'

interface DeleteAgentDialogProps {
  agent: GleanAgentConfig | null
  isOpen: boolean
  onClose: () => void
  onDeleted: () => void
}

export function DeleteAgentDialog({ agent, isOpen, onClose, onDeleted }: DeleteAgentDialogProps) {
  const { deleteGleanAgent } = useModelActions()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!agent) return

    setIsDeleting(true)

    try {
      await deleteGleanAgent(agent.id, agent.workspaceId)
      onDeleted()
      onClose()
    } catch (err) {
      console.error('Failed to delete agent:', err)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={isDeleting ? undefined : onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Agent</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>{agent?.name}</strong>? This action cannot be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

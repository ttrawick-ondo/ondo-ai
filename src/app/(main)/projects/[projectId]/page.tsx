'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Settings, Plus, MessageSquare } from 'lucide-react'
import Link from 'next/link'
import { cn, formatRelativeTime } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useProjectById, useProjectActions, useConversations, useChatActions } from '@/stores'

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string
  const project = useProjectById(projectId)
  const { setActiveProject } = useProjectActions()
  const conversations = useConversations()
  const { createConversation, setActiveConversation } = useChatActions()

  // Filter conversations for this project
  const projectConversations = conversations.filter((c) => c.projectId === projectId)

  useEffect(() => {
    if (project) {
      setActiveProject(projectId)
    }
  }, [project, projectId, setActiveProject])

  if (!project) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Project not found</p>
      </div>
    )
  }

  const handleNewChat = () => {
    const id = createConversation('New conversation', projectId)
    setActiveConversation(id)
    router.push(`/chat/${id}`)
  }

  const handleOpenConversation = (conversationId: string) => {
    setActiveConversation(conversationId)
    router.push(`/chat/${conversationId}`)
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/projects"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Projects
        </Link>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="h-6 w-6 rounded-lg"
              style={{ backgroundColor: project.color }}
            />
            <div>
              <h1 className="text-2xl font-semibold">{project.name}</h1>
              {project.description && (
                <p className="text-muted-foreground">{project.description}</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/projects/${projectId}/settings`}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Link>
            </Button>
            <Button size="sm" onClick={handleNewChat}>
              <Plus className="h-4 w-4 mr-2" />
              New Chat
            </Button>
          </div>
        </div>
      </div>

      {/* Conversations */}
      <div>
        <h2 className="text-lg font-medium mb-4">Conversations</h2>
        {projectConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg">
            <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-1">No conversations yet</h3>
            <p className="text-muted-foreground mb-4">
              Start a new conversation in this project
            </p>
            <Button onClick={handleNewChat}>
              <Plus className="h-4 w-4 mr-2" />
              Start Conversation
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {projectConversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => handleOpenConversation(conversation.id)}
                className="w-full flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{conversation.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {conversation.messageCount} messages
                    </p>
                  </div>
                </div>
                <span className="text-sm text-muted-foreground">
                  {formatRelativeTime(conversation.lastMessageAt)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

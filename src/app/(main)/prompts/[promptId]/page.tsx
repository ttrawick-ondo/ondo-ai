'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Copy,
  Star,
  Play,
  Pencil,
  Trash2,
  Users,
  Globe,
  Lock,
  Check,
} from 'lucide-react'
import Link from 'next/link'
import { cn, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  usePromptUIActions,
  useFavoriteIds,
  useChatActions,
  useActiveWorkspaceId,
} from '@/stores'
import {
  usePrompt,
  useDeletePrompt,
  useDuplicatePrompt,
  useIncrementPromptUsage,
} from '@/lib/queries'

export default function PromptDetailPage() {
  const params = useParams()
  const router = useRouter()
  const promptId = params.promptId as string
  const { data: promptData } = usePrompt(promptId)
  const favoriteIds = useFavoriteIds()
  const { toggleFavorite } = usePromptUIActions()
  const deletePromptMutation = useDeletePrompt()
  const duplicatePromptMutation = useDuplicatePrompt()
  const incrementUsageMutation = useIncrementPromptUsage()
  const { createConversation, setActiveConversation, sendMessage } = useChatActions()
  const activeWorkspaceId = useActiveWorkspaceId()
  const [copied, setCopied] = useState(false)
  const [variableValues, setVariableValues] = useState<Record<string, string>>({})

  // Add isFavorite based on local favorites
  const prompt = promptData ? { ...promptData, isFavorite: favoriteIds.has(promptData.id) } : null

  if (!prompt) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Prompt not found</p>
      </div>
    )
  }

  const getVisibilityIcon = () => {
    switch (prompt.visibility) {
      case 'private':
        return Lock
      case 'workspace':
        return Users
      case 'public':
        return Globe
      default:
        return Lock
    }
  }

  const VisibilityIcon = getVisibilityIcon()

  const handleCopy = async () => {
    await navigator.clipboard.writeText(getCompiledPrompt())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleUse = async () => {
    if (!prompt) return
    const content = getCompiledPrompt()
    const id = await createConversation(prompt.title, undefined, undefined, null, activeWorkspaceId)
    setActiveConversation(id)
    incrementUsageMutation.mutate(prompt.id)
    router.push(`/chat/${id}`)
    // Send the prompt as the first message
    setTimeout(() => {
      sendMessage({ content, promptId: prompt.id })
    }, 100)
  }

  const handleDelete = () => {
    if (!prompt) return
    deletePromptMutation.mutate(prompt.id)
    router.push('/prompts')
  }

  const handleDuplicate = () => {
    if (!prompt) return
    duplicatePromptMutation.mutate({ promptId: prompt.id, userId: 'user-1' })
  }

  const getCompiledPrompt = () => {
    let content = prompt.content
    prompt.variables.forEach((variable) => {
      const value = variableValues[variable.name] || variable.defaultValue || ''
      content = content.replace(new RegExp(`{{${variable.name}}}`, 'g'), value)
    })
    return content
  }

  // Check if all required variables have values
  const canUsePrompt = prompt.variables
    .filter((v) => v.required)
    .every((v) => variableValues[v.name] || v.defaultValue)

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/prompts"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Prompts
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-semibold">{prompt.title}</h1>
              {prompt.isFavorite && (
                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              )}
            </div>
            {prompt.description && (
              <p className="text-muted-foreground">{prompt.description}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => toggleFavorite(prompt.id)}
            >
              <Star
                className={cn(
                  'h-4 w-4',
                  prompt.isFavorite && 'fill-yellow-400 text-yellow-400'
                )}
              />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleDuplicate}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <VisibilityIcon className="h-4 w-4" />
            <span className="capitalize">{prompt.visibility}</span>
          </div>
          <span>{prompt.usageCount} uses</span>
          <span>Created {formatDate(prompt.createdAt)}</span>
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          {prompt.tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          {/* Variables */}
          {prompt.variables.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Variables</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {prompt.variables.map((variable) => (
                  <div key={variable.name} className="space-y-2">
                    <label className="text-sm font-medium">
                      {variable.name}
                      {variable.required && (
                        <span className="text-destructive ml-1">*</span>
                      )}
                    </label>
                    {variable.description && (
                      <p className="text-xs text-muted-foreground">
                        {variable.description}
                      </p>
                    )}
                    <Textarea
                      placeholder={variable.defaultValue || `Enter ${variable.name}`}
                      value={variableValues[variable.name] || ''}
                      onChange={(e) =>
                        setVariableValues({
                          ...variableValues,
                          [variable.name]: e.target.value,
                        })
                      }
                      rows={3}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Prompt Content */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Prompt</CardTitle>
              <Button variant="ghost" size="sm" onClick={handleCopy}>
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </>
                )}
              </Button>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg overflow-auto max-h-96">
                {getCompiledPrompt()}
              </pre>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <Button
                className="w-full"
                size="lg"
                onClick={handleUse}
                disabled={!canUsePrompt}
              >
                <Play className="h-4 w-4 mr-2" />
                Use Prompt
              </Button>
              {!canUsePrompt && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Fill in all required variables to use this prompt
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Template</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap text-xs bg-muted p-3 rounded-lg overflow-auto max-h-64 text-muted-foreground">
                {prompt.content}
              </pre>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

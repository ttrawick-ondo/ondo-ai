'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, X } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreatePrompt, usePromptCategories } from '@/lib/queries'

interface PromptVariable {
  name: string
  description: string
  defaultValue: string
  required: boolean
}

export default function NewPromptPage() {
  const router = useRouter()
  const { data: categories = [] } = usePromptCategories()
  const createPromptMutation = useCreatePrompt()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [content, setContent] = useState('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [visibility, setVisibility] = useState<'private' | 'workspace' | 'public'>('private')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [variables, setVariables] = useState<PromptVariable[]>([])

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag))
  }

  const handleAddVariable = () => {
    setVariables([
      ...variables,
      { name: '', description: '', defaultValue: '', required: false },
    ])
  }

  const handleUpdateVariable = (index: number, field: keyof PromptVariable, value: string | boolean) => {
    const updated = [...variables]
    updated[index] = { ...updated[index], [field]: value }
    setVariables(updated)
  }

  const handleRemoveVariable = (index: number) => {
    setVariables(variables.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim() || !content.trim()) return

    createPromptMutation.mutate(
      {
        name: title.trim(),
        description: description.trim() || undefined,
        content: content.trim(),
        category: categoryId || undefined,
        isPublic: visibility === 'public',
        tags,
        variables: variables.filter((v) => v.name.trim()),
        userId: 'user-1', // TODO: Get from auth
      },
      {
        onSuccess: (newPrompt) => {
          router.push(`/prompts/${newPrompt.id}`)
        },
      }
    )
  }

  const isValid = title.trim() && content.trim()

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

        <h1 className="text-2xl font-semibold">Create New Prompt</h1>
        <p className="text-muted-foreground">
          Create a reusable prompt template
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 md:grid-cols-3">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Code Review Assistant"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Briefly describe what this prompt does..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Prompt Content */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Prompt Content *</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Write your prompt here. Use {{variable_name}} for variables..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={10}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Tip: Use {"{{variable_name}}"} syntax to create variables that can be filled in when using the prompt.
                </p>
              </CardContent>
            </Card>

            {/* Variables */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Variables</CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={handleAddVariable}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Variable
                </Button>
              </CardHeader>
              <CardContent>
                {variables.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No variables defined. Add variables to make your prompt reusable.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {variables.map((variable, index) => (
                      <div key={index} className="flex gap-3 items-start p-3 border rounded-lg">
                        <div className="flex-1 grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Name</Label>
                            <Input
                              placeholder="variable_name"
                              value={variable.name}
                              onChange={(e) => handleUpdateVariable(index, 'name', e.target.value)}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Default Value</Label>
                            <Input
                              placeholder="Optional default"
                              value={variable.defaultValue}
                              onChange={(e) => handleUpdateVariable(index, 'defaultValue', e.target.value)}
                            />
                          </div>
                          <div className="space-y-1 sm:col-span-2">
                            <Label className="text-xs">Description</Label>
                            <Input
                              placeholder="What should the user enter?"
                              value={variable.description}
                              onChange={(e) => handleUpdateVariable(index, 'description', e.target.value)}
                            />
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="shrink-0"
                          onClick={() => handleRemoveVariable(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Visibility</Label>
                  <Select value={visibility} onValueChange={(v) => setVisibility(v as typeof visibility)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private">Private</SelectItem>
                      <SelectItem value="workspace">Workspace</SelectItem>
                      <SelectItem value="public">Public</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Tags</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add tag..."
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddTag()
                        }
                      }}
                    />
                    <Button type="button" variant="outline" onClick={handleAddTag}>
                      Add
                    </Button>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="gap-1">
                          {tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardContent className="pt-6 space-y-3">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={!isValid || createPromptMutation.isPending}
                >
                  {createPromptMutation.isPending ? 'Creating...' : 'Create Prompt'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push('/prompts')}
                >
                  Cancel
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  )
}

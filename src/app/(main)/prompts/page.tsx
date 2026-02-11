'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus,
  Search,
  Library,
  Star,
  Copy,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  Users,
  Globe,
  Lock,
} from 'lucide-react'
import { cn, formatRelativeTime } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  usePromptStore,
  usePromptUIActions,
  useFavoriteIds,
  useActiveCategoryId,
  usePromptSearchQuery,
} from '@/stores'
import {
  usePrompts as usePromptsQuery,
  usePromptCategories as usePromptCategoriesQuery,
  useDeletePrompt,
  useDuplicatePrompt,
} from '@/lib/queries'

export default function PromptsPage() {
  const router = useRouter()
  const { data: allPrompts = [] } = usePromptsQuery({ userId: 'user-1' }) // TODO: Get from auth
  const { data: categories = [] } = usePromptCategoriesQuery()
  const searchQuery = usePromptSearchQuery()
  const activeCategoryId = useActiveCategoryId()
  const favoriteIds = useFavoriteIds()
  const { setSearchQuery, setActiveCategory, toggleFavorite } = usePromptUIActions()
  const deletePromptMutation = useDeletePrompt()
  const duplicatePromptMutation = useDuplicatePrompt()

  // Add isFavorite to prompts based on local favorites
  const promptsWithFavorites = useMemo(() =>
    allPrompts.map(p => ({ ...p, isFavorite: favoriteIds.has(p.id) })),
    [allPrompts, favoriteIds]
  )

  // Compute filtered prompts
  const filteredPrompts = useMemo(() => {
    let result = promptsWithFavorites

    if (activeCategoryId === 'favorites') {
      result = result.filter(p => p.isFavorite)
    } else if (activeCategoryId) {
      result = result.filter(p => p.categoryId === activeCategoryId)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        p =>
          p.title.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query) ||
          p.tags.some(t => t.toLowerCase().includes(query))
      )
    }

    return result
  }, [promptsWithFavorites, activeCategoryId, searchQuery])

  const favoritePrompts = useMemo(() =>
    promptsWithFavorites.filter(p => p.isFavorite),
    [promptsWithFavorites]
  )

  const deletePrompt = (id: string) => deletePromptMutation.mutate(id)
  const duplicatePrompt = (id: string) => duplicatePromptMutation.mutate({ promptId: id, userId: 'user-1' })

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
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

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-64 border-r p-4 space-y-4">
        <Button className="w-full" onClick={() => router.push('/prompts/new')}>
          <Plus className="h-4 w-4 mr-2" />
          New Prompt
        </Button>

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search prompts..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <button
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors',
              !activeCategoryId
                ? 'bg-secondary text-secondary-foreground'
                : 'hover:bg-muted'
            )}
            onClick={() => setActiveCategory(null)}
          >
            <Library className="h-4 w-4" />
            All Prompts
          </button>
          <button
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors',
              activeCategoryId === 'favorites'
                ? 'bg-secondary text-secondary-foreground'
                : 'hover:bg-muted'
            )}
            onClick={() => setActiveCategory('favorites')}
          >
            <Star className="h-4 w-4" />
            Favorites
            {favoritePrompts.length > 0 && (
              <Badge variant="secondary" className="ml-auto">
                {favoritePrompts.length}
              </Badge>
            )}
          </button>
        </div>

        <div className="pt-4 border-t space-y-1">
          <p className="text-xs font-medium text-muted-foreground px-3 py-1">Categories</p>
          {categories.map((category) => (
            <button
              key={category.id}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors',
                activeCategoryId === category.id
                  ? 'bg-secondary text-secondary-foreground'
                  : 'hover:bg-muted'
              )}
              onClick={() => setActiveCategory(category.id)}
            >
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: category.color }}
              />
              {category.name}
              <Badge variant="outline" className="ml-auto">
                {category.promptCount}
              </Badge>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Prompt Library</h1>
          <p className="text-muted-foreground">
            Save, organize, and reuse your prompts
          </p>
        </div>

        {filteredPrompts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Library className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-1">No prompts found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery
                ? 'Try a different search term'
                : 'Create your first prompt to get started'}
            </p>
            {!searchQuery && (
              <Button onClick={() => router.push('/prompts/new')}>
                <Plus className="h-4 w-4 mr-2" />
                Create Prompt
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredPrompts.map((prompt) => {
              const VisibilityIcon = getVisibilityIcon(prompt.visibility)
              return (
                <Card
                  key={prompt.id}
                  className="group cursor-pointer transition-shadow hover:shadow-md"
                  onClick={() => router.push(`/prompts/${prompt.id}`)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base truncate">
                            {prompt.title}
                          </CardTitle>
                          {prompt.isFavorite && (
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 shrink-0" />
                          )}
                        </div>
                        {prompt.description && (
                          <CardDescription className="line-clamp-2 mt-1">
                            {prompt.description}
                          </CardDescription>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/prompts/${prompt.id}`)
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleFavorite(prompt.id)
                            }}
                          >
                            <Star className="h-4 w-4 mr-2" />
                            {prompt.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              duplicatePrompt(prompt.id)
                            }}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={(e) => {
                              e.stopPropagation()
                              deletePrompt(prompt.id)
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {prompt.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {prompt.tags.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{prompt.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <VisibilityIcon className="h-3.5 w-3.5" />
                        <span className="capitalize">{prompt.visibility}</span>
                      </div>
                      <span>{prompt.usageCount} uses</span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

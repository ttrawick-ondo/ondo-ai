'use client'

import { useState } from 'react'
import {
  User,
  Users,
  Briefcase,
  Mail,
  Phone,
  MapPin,
  Linkedin,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  AlertCircle,
  HelpCircle,
  FileText,
  Calendar,
  Building,
  Search,
  FolderTree,
  Loader2,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type {
  OndoBotStructuredResult,
  OwnershipSearchStructured,
  OwnerListStructured,
  OwnerAreasStructured,
  OwnershipCreatedStructured,
  OwnershipFormStructured,
  OwnershipParentSelectionStructured,
  CandidateSearchStructured,
  CandidateProfileStructured,
  RecentCandidatesStructured,
  HelpStructured,
  FormSubmissionStructured,
  ErrorStructured,
  PaginationInfo,
} from '@/types/ondobot'

interface OndoBotResultsProps {
  structured: OndoBotStructuredResult
  className?: string
}

/**
 * Main component that routes to the appropriate result renderer
 */
export function OndoBotResults({ structured, className }: OndoBotResultsProps) {
  switch (structured.type) {
    case 'ownership_search':
      return <OwnershipSearchResult data={structured} className={className} />
    case 'owner_list':
      return <OwnerListResult data={structured} className={className} />
    case 'owner_areas':
      return <OwnerAreasResult data={structured} className={className} />
    case 'ownership_created':
      return <OwnershipCreatedResult data={structured} className={className} />
    case 'ownership_form':
      return <OwnershipFormResult data={structured} className={className} />
    case 'ownership_parent_selection':
      return <ParentSelectionResult data={structured} className={className} />
    case 'candidate_search':
      return <CandidateSearchResult data={structured} className={className} />
    case 'candidate_profile':
      return <CandidateProfileResult data={structured} className={className} />
    case 'recent_candidates':
      return <RecentCandidatesResult data={structured} className={className} />
    case 'help':
      return <HelpResult data={structured} className={className} />
    case 'form_submission':
      return <FormSubmissionResult data={structured} className={className} />
    case 'error':
      return <ErrorResult data={structured} className={className} />
    default:
      return null
  }
}

/**
 * Pagination footer component
 */
function PaginationFooter({ pagination }: { pagination: PaginationInfo }) {
  if (pagination.total === 0) return null

  return (
    <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
      <span>
        Showing {pagination.showing} of {pagination.total}
      </span>
      {pagination.hasMore && (
        <span className="text-primary">More results available</span>
      )}
    </div>
  )
}

/**
 * Ownership Search Results
 */
function OwnershipSearchResult({
  data,
  className,
}: {
  data: OwnershipSearchStructured
  className?: string
}) {
  const [expanded, setExpanded] = useState(false)
  const results = data.data.results
  const displayCount = expanded ? results.length : Math.min(3, results.length)

  if (results.length === 0) {
    return (
      <Card className={cn('bg-muted/50', className)}>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span>No ownership results found</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Ownership Results
          </CardTitle>
          <Badge variant="secondary">{data.pagination.total} found</Badge>
        </div>
        <CardDescription>{data.summary}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {results.slice(0, displayCount).map((result, idx) => (
          <div
            key={idx}
            className="flex items-start justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
          >
            <div className="space-y-1 flex-1 min-w-0">
              <div className="font-medium text-sm truncate">{result.area}</div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <User className="h-3 w-3" />
                <span>{result.owner}</span>
              </div>
              {result.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {result.description}
                </p>
              )}
            </div>
            <a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 p-1.5 rounded-md hover:bg-background transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
            </a>
          </div>
        ))}

        {results.length > 3 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                Show {results.length - 3} more
              </>
            )}
          </Button>
        )}

        <PaginationFooter pagination={data.pagination} />
      </CardContent>
    </Card>
  )
}

/**
 * Owner List Results
 */
function OwnerListResult({
  data,
  className,
}: {
  data: OwnerListStructured
  className?: string
}) {
  const [expanded, setExpanded] = useState(false)
  const owners = data.data.owners
  const displayCount = expanded ? owners.length : Math.min(5, owners.length)

  if (owners.length === 0) {
    return (
      <Card className={cn('bg-muted/50', className)}>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span>No ownership data available</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Ownership Overview
          </CardTitle>
          <div className="flex gap-2">
            <Badge variant="outline">{data.pagination.total} owners</Badge>
            <Badge variant="secondary">{data.data.totalAreas} areas</Badge>
          </div>
        </div>
        <CardDescription>{data.summary}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {owners.slice(0, displayCount).map((owner, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{owner.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {owner.topAreas.slice(0, 2).join(', ')}
                    {owner.areaCount > 2 && ` +${owner.areaCount - 2} more`}
                  </div>
                </div>
              </div>
              <Badge variant="secondary" className="shrink-0">
                {owner.areaCount} areas
              </Badge>
            </div>
          ))}
        </div>

        {owners.length > 5 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                Show {owners.length - 5} more
              </>
            )}
          </Button>
        )}

        <PaginationFooter pagination={data.pagination} />
      </CardContent>
    </Card>
  )
}

/**
 * Owner Areas Results
 */
function OwnerAreasResult({
  data,
  className,
}: {
  data: OwnerAreasStructured
  className?: string
}) {
  const [expanded, setExpanded] = useState(false)
  const areas = data.data.areas
  const displayCount = expanded ? areas.length : Math.min(5, areas.length)

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            {data.data.owner}
          </CardTitle>
          <Badge variant="secondary">{data.pagination.total} areas</Badge>
        </div>
        <CardDescription>{data.summary}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {areas.slice(0, displayCount).map((area, idx) => (
          <div
            key={idx}
            className="flex items-start justify-between p-2 rounded-lg bg-muted/50"
          >
            <div className="space-y-0.5 flex-1 min-w-0">
              <div className="font-medium text-sm">{area.area}</div>
              {area.description && (
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {area.description}
                </p>
              )}
            </div>
            <a
              href={area.url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 p-1 rounded-md hover:bg-background transition-colors shrink-0"
            >
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
            </a>
          </div>
        ))}

        {areas.length > 5 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                Show {areas.length - 5} more
              </>
            )}
          </Button>
        )}

        <PaginationFooter pagination={data.pagination} />
      </CardContent>
    </Card>
  )
}

/**
 * Ownership Created Result
 */
function OwnershipCreatedResult({
  data,
  className,
}: {
  data: OwnershipCreatedStructured
  className?: string
}) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <CardTitle className="text-base">Ownership Created</CardTitle>
        </div>
        <CardDescription>{data.summary}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="p-3 rounded-lg bg-muted/50 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium text-sm">{data.data.area}</span>
            <a
              href={data.data.pageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-md hover:bg-background transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
            </a>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            <span>Owned by {data.data.owner}</span>
          </div>
          {data.data.description && (
            <p className="text-xs text-muted-foreground">{data.data.description}</p>
          )}
        </div>
        <a
          href={data.data.pageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-primary hover:underline mt-3"
        >
          <FileText className="h-4 w-4" />
          View in Notion
          <ExternalLink className="h-3 w-3" />
        </a>
      </CardContent>
    </Card>
  )
}

/**
 * Ownership Form Result - Full form for creating ownership
 */
function OwnershipFormResult({
  data,
  className,
}: {
  data: OwnershipFormStructured
  className?: string
}) {
  // Defensive: ensure data structure exists
  const prefill = data.data?.prefill || {}
  const hierarchy = data.data?.hierarchy || []

  const [areaName, setAreaName] = useState(prefill.area || '')
  const [owner, setOwner] = useState(prefill.owner || '')
  const [description, setDescription] = useState(prefill.description || '')
  const [selectedParentPath, setSelectedParentPath] = useState<string[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ area: string; owner: string; pageUrl: string } | null>(null)

  // Build hierarchy map for quick lookups
  const hierarchyMap = new Map(hierarchy.map(item => [item.id, item]))

  // Get root-level items (no parentId)
  const rootItems = hierarchy.filter(item => !item.parentId)

  // Get children of a parent
  const getChildren = (parentId: string) => {
    return hierarchy.filter(item => item.parentId === parentId)
  }

  // Get items at each level of the selected path
  const getLevelItems = (level: number): typeof hierarchy => {
    if (level === 0) return rootItems
    const parentId = selectedParentPath[level - 1]
    return getChildren(parentId)
  }

  // Handle parent selection at a level
  const handleParentSelect = (level: number, itemId: string) => {
    if (itemId === '') {
      // Clear selection at this level and below
      setSelectedParentPath(prev => prev.slice(0, level))
    } else {
      // Set selection at this level, clear below
      setSelectedParentPath(prev => [...prev.slice(0, level), itemId])
    }
  }

  // Get currently selected parent info
  const selectedParent = selectedParentPath.length > 0
    ? hierarchyMap.get(selectedParentPath[selectedParentPath.length - 1])
    : null

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!areaName.trim()) {
      setError('Area name is required')
      return
    }
    if (!owner.trim()) {
      setError('Owner is required')
      return
    }

    setIsCreating(true)
    setError(null)

    try {
      const response = await fetch('/api/actions/ondobot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'execute_tool',
          parameters: {
            tool: 'set_ownership',
            params: {
              area: areaName.trim(),
              owner: owner.trim(),
              description: description.trim() || undefined,
              parentId: selectedParent?.id,
            },
          },
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || result.data?.message || 'Failed to create ownership')
      }

      // Handle success
      setSuccess({
        area: result.data?.area || areaName,
        owner: result.data?.owner || owner,
        pageUrl: result.data?.pageUrl || '',
      })
    } catch (err) {
      console.error('Error creating ownership:', err)
      setError(err instanceof Error ? err.message : 'Failed to create ownership')
    } finally {
      setIsCreating(false)
    }
  }

  // Show success state
  if (success) {
    return (
      <Card className={cn('overflow-hidden', className)}>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <CardTitle className="text-base">Ownership Created</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="p-3 rounded-lg bg-muted/50 space-y-2">
            <div className="font-medium text-sm">{success.area}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              <span>Owned by {success.owner}</span>
            </div>
          </div>
          {success.pageUrl && (
            <a
              href={success.pageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline mt-3"
            >
              <FileText className="h-4 w-4" />
              View in Notion
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <FolderTree className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Create Ownership Area</CardTitle>
        </div>
        <CardDescription>
          Fill in the details below to create a new ownership area
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Area Name */}
          <div className="space-y-1.5">
            <label htmlFor="area-name" className="text-sm font-medium">
              Area Name <span className="text-destructive">*</span>
            </label>
            <Input
              id="area-name"
              placeholder="e.g., API Development, Customer Support"
              value={areaName}
              onChange={(e) => setAreaName(e.target.value)}
              disabled={isCreating}
            />
          </div>

          {/* Owner */}
          <div className="space-y-1.5">
            <label htmlFor="owner" className="text-sm font-medium">
              Owner <span className="text-destructive">*</span>
            </label>
            <Input
              id="owner"
              placeholder="Email (john@company.com) or name (John Smith)"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              disabled={isCreating}
            />
            <p className="text-xs text-muted-foreground">
              Use email for best results
            </p>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label htmlFor="description" className="text-sm font-medium">
              Description <span className="text-muted-foreground">(optional)</span>
            </label>
            <textarea
              id="description"
              placeholder="Brief description of this ownership area..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isCreating}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {/* Parent Selection - Cascading Dropdowns */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Select Parent Area <span className="text-muted-foreground">(optional - leave empty for top-level)</span>
            </label>

            {/* Current selection display */}
            {selectedParent && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10 border border-primary/20">
                <FolderTree className="h-4 w-4 text-primary" />
                <span className="text-sm flex-1">Parent: {selectedParent.fullPath}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2"
                  onClick={() => setSelectedParentPath([])}
                  disabled={isCreating}
                >
                  Clear
                </Button>
              </div>
            )}

            {/* Cascading dropdowns */}
            {Array.from({ length: selectedParentPath.length + 1 }).map((_, level) => {
              const items = getLevelItems(level)
              if (items.length === 0) return null

              const selectedAtLevel = selectedParentPath[level]
              const selectedItem = selectedAtLevel ? hierarchyMap.get(selectedAtLevel) : null

              return (
                <div key={level} className="space-y-1">
                  {level > 0 && selectedItem && (
                    <p className="text-xs text-muted-foreground pl-1">
                      Drill down under &quot;{hierarchyMap.get(selectedParentPath[level - 1])?.name}&quot;
                    </p>
                  )}
                  <select
                    value={selectedAtLevel || ''}
                    onChange={(e) => handleParentSelect(level, e.target.value)}
                    disabled={isCreating}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">
                      {level === 0 ? 'Select parent area...' : 'Select to go deeper or leave as-is...'}
                    </option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                        {item.hasChildren ? ' ▸' : ''}
                        {item.owner ? ` (${item.owner})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )
            })}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Create
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

/**
 * Simple fuzzy match - checks if query characters appear in order in the target
 */
function fuzzyMatch(query: string, target: string): boolean {
  const queryLower = query.toLowerCase()
  const targetLower = target.toLowerCase()

  // First check simple includes
  if (targetLower.includes(queryLower)) return true

  // Then check fuzzy (characters in order)
  let queryIndex = 0
  for (let i = 0; i < targetLower.length && queryIndex < queryLower.length; i++) {
    if (targetLower[i] === queryLower[queryIndex]) {
      queryIndex++
    }
  }
  return queryIndex === queryLower.length
}

/**
 * Score a match for sorting - higher is better
 */
function scoreMatch(query: string, match: { name: string; fullPath: string; owner?: string }): number {
  const queryLower = query.toLowerCase()
  const nameLower = match.name.toLowerCase()
  const pathLower = match.fullPath.toLowerCase()

  // Exact name match
  if (nameLower === queryLower) return 100
  // Name starts with query
  if (nameLower.startsWith(queryLower)) return 90
  // Name contains query
  if (nameLower.includes(queryLower)) return 80
  // Path contains query
  if (pathLower.includes(queryLower)) return 60
  // Fuzzy match on name
  if (fuzzyMatch(queryLower, nameLower)) return 40
  // Fuzzy match on path
  if (fuzzyMatch(queryLower, pathLower)) return 20
  // Owner match
  if (match.owner?.toLowerCase().includes(queryLower)) return 10
  return 0
}

/**
 * Parent match with children info
 */
interface ParentMatchWithChildren {
  id: string
  name: string
  fullPath: string
  owner?: string
  children: ParentMatchWithChildren[]
  hasChildren: boolean
}

/**
 * Build hierarchy from flat list of matches
 */
function buildHierarchy(
  matches: Array<{ id: string; name: string; fullPath: string; owner?: string }>
): ParentMatchWithChildren[] {
  // Group by path depth and find parent-child relationships
  const matchMap = new Map<string, ParentMatchWithChildren>()

  // First pass: create all nodes
  for (const match of matches) {
    matchMap.set(match.fullPath, {
      ...match,
      children: [],
      hasChildren: false,
    })
  }

  // Second pass: find children
  for (const match of matches) {
    const pathParts = match.fullPath.split(' > ')
    if (pathParts.length > 1) {
      // This has a parent - check if parent exists in our matches
      const parentPath = pathParts.slice(0, -1).join(' > ')
      const parent = matchMap.get(parentPath)
      if (parent) {
        parent.hasChildren = true
        parent.children.push(matchMap.get(match.fullPath)!)
      }
    }
  }

  // Also check for children that aren't in matches but exist (infer from paths)
  const allPaths = Array.from(matchMap.keys())
  Array.from(matchMap.entries()).forEach(([path, node]) => {
    // Check if any other path starts with this path + " > "
    for (const otherPath of allPaths) {
      if (otherPath !== path && otherPath.startsWith(path + ' > ')) {
        node.hasChildren = true
        break
      }
    }
  })

  return Array.from(matchMap.values())
}

/**
 * Parent Selection Result - Interactive component for selecting parent area
 */
function ParentSelectionResult({
  data,
  className,
}: {
  data: OwnershipParentSelectionStructured
  className?: string
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPath, setCurrentPath] = useState<string[]>([]) // Breadcrumb path for drill-down
  const [isCreating, setIsCreating] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Build hierarchy from matches
  const allMatches = buildHierarchy(data.data.parentMatches)

  // Get current level items based on drill-down path
  const getCurrentItems = (): ParentMatchWithChildren[] => {
    if (currentPath.length === 0) {
      // At root - show top-level items or search results
      if (searchQuery.trim()) {
        // Search mode - filter all with fuzzy matching
        return allMatches
          .map(match => ({
            match,
            score: scoreMatch(searchQuery, match)
          }))
          .filter(({ score }) => score > 0)
          .sort((a, b) => b.score - a.score)
          .map(({ match }) => match)
      }
      // Show items without " > " in path (top level) or first level matches
      return allMatches.filter(m => !m.fullPath.includes(' > ') ||
        // Also include if parent path isn't in matches
        !allMatches.some(other => m.fullPath.startsWith(other.fullPath + ' > ') && other.fullPath !== m.fullPath)
      )
    }

    // Drilled down - show children of current path
    const currentPathStr = currentPath.join(' > ')
    return allMatches.filter(m => {
      const parentPath = m.fullPath.split(' > ').slice(0, -1).join(' > ')
      return parentPath === currentPathStr
    })
  }

  const currentItems = getCurrentItems()

  // Get selected match details
  const selectedMatch = selectedId
    ? allMatches.find(m => m.id === selectedId)
    : null

  // Handle search change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    // Clear drill-down when searching
    if (value.trim()) {
      setCurrentPath([])
    }
  }

  // Handle drill down into a parent
  const handleDrillDown = (match: ParentMatchWithChildren) => {
    setCurrentPath(match.fullPath.split(' > '))
    setSearchQuery('')
  }

  // Handle going back up
  const handleGoBack = () => {
    setCurrentPath(prev => prev.slice(0, -1))
  }

  // Handle parent selection - just select, don't create yet
  const handleSelect = (match: ParentMatchWithChildren) => {
    setSelectedId(match.id === selectedId ? null : match.id)
    setError(null)
  }

  // Handle confirm - create with selected parent
  const handleConfirm = async () => {
    if (!selectedId) return

    setIsCreating(true)
    setError(null)

    try {
      const response = await fetch('/api/actions/ondobot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'execute_tool',
          parameters: {
            tool: 'set_ownership',
            params: {
              area: data.data.pendingArea,
              owner: data.data.pendingOwnerSlackId,
              description: data.data.pendingDescription,
              parentId: selectedId,
            },
          },
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to create ownership')
      }

      window.location.reload()
    } catch (err) {
      console.error('Error creating ownership:', err)
      setError(err instanceof Error ? err.message : 'Failed to create ownership')
      setIsCreating(false)
    }
  }

  // Handle skip - create at top level
  const handleSkip = async () => {
    setIsCreating(true)
    setError(null)
    setSelectedId(null)

    try {
      const response = await fetch('/api/actions/ondobot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'execute_tool',
          parameters: {
            tool: 'set_ownership',
            params: {
              area: data.data.pendingArea,
              owner: data.data.pendingOwnerSlackId,
              description: data.data.pendingDescription,
            },
          },
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to create ownership')
      }

      window.location.reload()
    } catch (err) {
      console.error('Error creating ownership:', err)
      setError(err instanceof Error ? err.message : 'Failed to create ownership')
      setIsCreating(false)
    }
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <FolderTree className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Select Parent Area</CardTitle>
        </div>
        <CardDescription>
          Creating <strong>{data.data.pendingArea}</strong> owned by{' '}
          <strong>{data.data.pendingOwner}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Error message */}
        {error && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10 text-destructive text-sm">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search all areas..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
            disabled={isCreating}
          />
        </div>

        {/* Breadcrumb navigation */}
        {currentPath.length > 0 && !searchQuery && (
          <div className="flex items-center gap-1 text-sm">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2"
              onClick={() => setCurrentPath([])}
              disabled={isCreating}
            >
              All
            </Button>
            {currentPath.map((part, idx) => (
              <div key={idx} className="flex items-center gap-1">
                <ChevronDown className="h-3 w-3 rotate-[-90deg] text-muted-foreground" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2"
                  onClick={() => setCurrentPath(currentPath.slice(0, idx + 1))}
                  disabled={isCreating || idx === currentPath.length - 1}
                >
                  {part}
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Parent options */}
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {currentPath.length > 0 && !searchQuery && (
            <button
              onClick={handleGoBack}
              disabled={isCreating}
              className="w-full flex items-center gap-2 p-2 rounded-lg text-left text-sm text-muted-foreground hover:bg-muted/50"
            >
              <ChevronUp className="h-4 w-4" />
              Back to {currentPath.length === 1 ? 'All' : currentPath[currentPath.length - 2]}
            </button>
          )}

          {currentItems.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 text-center">
              {searchQuery ? 'No matching areas found' : 'No areas at this level'}
            </div>
          ) : (
            currentItems.map((match) => (
              <div
                key={match.id}
                className={cn(
                  'flex items-center gap-2 p-3 rounded-lg transition-colors border-2',
                  selectedId === match.id
                    ? 'border-primary bg-primary/10'
                    : 'border-transparent hover:bg-muted/50',
                  isCreating && 'opacity-50'
                )}
              >
                {/* Select button */}
                <button
                  onClick={() => handleSelect(match)}
                  disabled={isCreating}
                  className="flex-1 flex items-start text-left min-w-0"
                >
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <div className="font-medium text-sm flex items-center gap-2">
                      {selectedId === match.id && (
                        <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                      )}
                      {match.name}
                    </div>
                    {searchQuery && match.fullPath !== match.name && (
                      <div className="text-xs text-muted-foreground truncate">
                        {match.fullPath}
                      </div>
                    )}
                    {match.owner && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span>{match.owner}</span>
                      </div>
                    )}
                  </div>
                </button>

                {/* Drill down button */}
                {match.hasChildren && !searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 shrink-0"
                    onClick={() => handleDrillDown(match)}
                    disabled={isCreating}
                  >
                    <ChevronDown className="h-4 w-4 rotate-[-90deg]" />
                  </Button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Selected confirmation */}
        {selectedMatch && (
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <div className="text-sm">
              <span className="text-muted-foreground">Will create under: </span>
              <strong>{selectedMatch.fullPath}</strong>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t gap-2">
          <span className="text-xs text-muted-foreground">
            {currentItems.length} areas
          </span>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              disabled={isCreating}
            >
              {isCreating && !selectedId ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Creating...
                </>
              ) : (
                'Skip'
              )}
            </Button>
            {selectedId && (
              <Button
                size="sm"
                onClick={handleConfirm}
                disabled={isCreating}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Confirm
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Candidate Search Results
 */
function CandidateSearchResult({
  data,
  className,
}: {
  data: CandidateSearchStructured
  className?: string
}) {
  const candidates = data.data.candidates

  if (candidates.length === 0) {
    return (
      <Card className={cn('bg-muted/50', className)}>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span>No candidates found</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Candidates
          </CardTitle>
          <Badge variant="secondary">{data.pagination.total} found</Badge>
        </div>
        <CardDescription>{data.summary}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {candidates.map((candidate) => (
          <div
            key={candidate.id}
            className="flex items-start justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
          >
            <div className="space-y-1 flex-1 min-w-0">
              <div className="font-medium text-sm">{candidate.name}</div>
              {(candidate.title || candidate.company) && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  {candidate.title && <span>{candidate.title}</span>}
                  {candidate.title && candidate.company && <span>at</span>}
                  {candidate.company && (
                    <span className="flex items-center gap-1">
                      <Building className="h-3 w-3" />
                      {candidate.company}
                    </span>
                  )}
                </div>
              )}
              {candidate.email && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Mail className="h-3 w-3" />
                  <span>{candidate.email}</span>
                </div>
              )}
            </div>
            <a
              href={candidate.profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 p-1.5 rounded-md hover:bg-background transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
            </a>
          </div>
        ))}

        <PaginationFooter pagination={data.pagination} />
      </CardContent>
    </Card>
  )
}

/**
 * Candidate Profile Result
 */
function CandidateProfileResult({
  data,
  className,
}: {
  data: CandidateProfileStructured
  className?: string
}) {
  const profile = data.data

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{profile.name}</CardTitle>
            {(profile.title || profile.company) && (
              <CardDescription>
                {profile.title}
                {profile.title && profile.company && ' at '}
                {profile.company}
              </CardDescription>
            )}
          </div>
          <a
            href={profile.profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-md hover:bg-muted transition-colors"
          >
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </a>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2">
          {profile.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <a href={`mailto:${profile.email}`} className="text-primary hover:underline">
                {profile.email}
              </a>
            </div>
          )}
          {profile.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{profile.phone}</span>
            </div>
          )}
          {profile.location && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{profile.location}</span>
            </div>
          )}
          {profile.linkedIn && (
            <div className="flex items-center gap-2 text-sm">
              <Linkedin className="h-4 w-4 text-muted-foreground" />
              <a
                href={profile.linkedIn}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                LinkedIn Profile
              </a>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Recent Candidates Results
 */
function RecentCandidatesResult({
  data,
  className,
}: {
  data: RecentCandidatesStructured
  className?: string
}) {
  const candidates = data.data.candidates

  if (candidates.length === 0) {
    return (
      <Card className={cn('bg-muted/50', className)}>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span>No recent candidates</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Recent Candidates
          </CardTitle>
          <Badge variant="secondary">{data.pagination.showing} shown</Badge>
        </div>
        <CardDescription>{data.summary}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {candidates.map((candidate) => (
          <div
            key={candidate.id}
            className="flex items-start justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
          >
            <div className="space-y-1 flex-1 min-w-0">
              <div className="font-medium text-sm">{candidate.name}</div>
              {candidate.title && (
                <div className="text-xs text-muted-foreground">{candidate.title}</div>
              )}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {candidate.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {candidate.email}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(candidate.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
            <a
              href={candidate.profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 p-1.5 rounded-md hover:bg-background transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
            </a>
          </div>
        ))}

        <PaginationFooter pagination={data.pagination} />
      </CardContent>
    </Card>
  )
}

/**
 * Help Result
 */
function HelpResult({
  data,
  className,
}: {
  data: HelpStructured
  className?: string
}) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <HelpCircle className="h-4 w-4" />
          OndoBot Help
        </CardTitle>
        <CardDescription>{data.data.overview}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.data.categories.map((category, idx) => (
          <div key={idx}>
            <h4 className="font-medium text-sm mb-2">{category.name}</h4>
            <div className="space-y-1">
              {category.tools.map((tool, toolIdx) => (
                <div
                  key={toolIdx}
                  className="text-xs text-muted-foreground flex items-start gap-2"
                >
                  <span className="text-primary">•</span>
                  <span>{tool.description}</span>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div>
          <h4 className="font-medium text-sm mb-2">Try Asking</h4>
          <div className="flex flex-wrap gap-2">
            {data.data.examples.map((example, idx) => (
              <Badge key={idx} variant="outline" className="font-normal">
                {example}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Form Submission Result
 */
function FormSubmissionResult({
  data,
  className,
}: {
  data: FormSubmissionStructured
  className?: string
}) {
  const formLabels: Record<string, string> = {
    incident_report: 'Incident Report',
    project_proposal: 'Project Proposal',
    issue: 'Issue',
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          {data.data.submitted ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <XCircle className="h-5 w-5 text-destructive" />
          )}
          <CardTitle className="text-base">
            {formLabels[data.data.formType]} {data.data.submitted ? 'Submitted' : 'Failed'}
          </CardTitle>
        </div>
        <CardDescription>{data.summary}</CardDescription>
      </CardHeader>
      {data.data.notionPageUrl && (
        <CardContent>
          <a
            href={data.data.notionPageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <FileText className="h-4 w-4" />
            View in Notion
            <ExternalLink className="h-3 w-3" />
          </a>
        </CardContent>
      )}
    </Card>
  )
}

/**
 * Error Result
 */
function ErrorResult({
  data,
  className,
}: {
  data: ErrorStructured
  className?: string
}) {
  return (
    <Card className={cn('border-destructive/50 bg-destructive/5', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <CardTitle className="text-base text-destructive">Error</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{data.data.message}</p>
        {data.data.code && (
          <Badge variant="outline" className="mt-2 font-mono text-xs">
            {data.data.code}
          </Badge>
        )}
      </CardContent>
    </Card>
  )
}

export default OndoBotResults

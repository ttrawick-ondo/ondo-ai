'use client'

import { useMemo, useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { MessageSquare, GitBranch, Folder, User, Bot, Search, ArrowRight, Loader2 } from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { conversationApi, type SearchResultItem, type MessageSnippet } from '@/lib/api/client/conversations'
import { useChatActions, useFolders, useProjects, useActiveWorkspaceId, useCurrentUser } from '@/stores'
import type { Conversation } from '@/types'

interface SearchResultsProps {
  query: string
  conversations: Conversation[]
  folderId?: string | null
  sortBy?: 'date' | 'relevance'
}

interface SearchResult {
  conversation: Conversation
  matchingMessages: MessageSnippet[]
  folderName?: string
  folderColor?: string
  projectName?: string
}

export function SearchResults({ query, conversations, folderId, sortBy = 'relevance' }: SearchResultsProps) {
  const router = useRouter()
  const { setActiveConversation } = useChatActions()
  const activeWorkspaceId = useActiveWorkspaceId()
  const currentUser = useCurrentUser()
  const folders = useFolders()
  const projects = useProjects(activeWorkspaceId)

  const [serverResults, setServerResults] = useState<SearchResultItem[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  // Build lookup maps
  const folderMap = useMemo(() => {
    const map: Record<string, { name: string; color?: string | null }> = {}
    for (const folder of folders) {
      map[folder.id] = { name: folder.name, color: folder.color }
    }
    return map
  }, [folders])

  const projectMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const project of projects) {
      map[project.id] = project.name
    }
    return map
  }, [projects])

  // Debounced server search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    const trimmed = query.trim()
    if (!trimmed || !currentUser?.id) {
      setServerResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await conversationApi.searchConversations(
          currentUser.id,
          activeWorkspaceId,
          trimmed,
          {
            folderId: folderId ?? undefined,
            limit: 30,
          }
        )
        setServerResults(results)
      } catch {
        setServerResults([])
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, currentUser?.id, activeWorkspaceId, folderId])

  // Build results from server response with folder/project context
  const results = useMemo((): SearchResult[] => {
    if (!query.trim()) return []
    const lowerQuery = query.toLowerCase()

    // Use server results as the source of truth
    // Fall back to client-side title search if server hasn't returned yet
    if (serverResults.length > 0) {
      const resultsWithContext: SearchResult[] = serverResults.map((item) => {
        const conv = item.conversation
        const folder = conv.folderId ? folderMap[conv.folderId] : undefined
        const projectName = conv.projectId ? projectMap[conv.projectId] : undefined

        return {
          conversation: conv,
          matchingMessages: item.matchingMessages,
          folderName: folder?.name,
          folderColor: folder?.color ?? undefined,
          projectName,
        }
      })

      // Sort
      if (sortBy === 'relevance') {
        resultsWithContext.sort((a, b) => {
          const scoreA = (a.conversation.title.toLowerCase().includes(lowerQuery) ? 10 : 0) + a.matchingMessages.length
          const scoreB = (b.conversation.title.toLowerCase().includes(lowerQuery) ? 10 : 0) + b.matchingMessages.length
          return scoreB - scoreA
        })
      } else {
        resultsWithContext.sort(
          (a, b) =>
            new Date(b.conversation.lastMessageAt).getTime() -
            new Date(a.conversation.lastMessageAt).getTime()
        )
      }

      return resultsWithContext
    }

    // Fallback: client-side title search while server is loading
    const fallback = conversations
      .filter((conv) => {
        if (conv.parentId) return false
        if (folderId && conv.folderId !== folderId) return false
        return conv.title.toLowerCase().includes(lowerQuery)
      })
      .map((conv) => {
        const folder = conv.folderId ? folderMap[conv.folderId] : undefined
        const projectName = conv.projectId ? projectMap[conv.projectId] : undefined
        return {
          conversation: conv,
          matchingMessages: [] as MessageSnippet[],
          folderName: folder?.name,
          folderColor: folder?.color ?? undefined,
          projectName,
        }
      })

    return fallback
  }, [query, serverResults, conversations, folderId, sortBy, folderMap, projectMap])

  const handleSelect = (conversationId: string) => {
    setActiveConversation(conversationId)
    router.push(`/chat/${conversationId}`)
  }

  // Empty state — no query
  if (!query.trim()) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Search className="h-8 w-8 text-muted-foreground/60" />
        </div>
        <h3 className="text-base font-medium mb-1">Search your conversations</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Find messages across all your conversations. Search by keywords, phrases, or topics.
        </p>
      </div>
    )
  }

  // Loading state
  if (isSearching && results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">Searching...</p>
      </div>
    )
  }

  // Empty state — no results
  if (!isSearching && results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Search className="h-8 w-8 text-muted-foreground/60" />
        </div>
        <h3 className="text-base font-medium mb-1">No results found</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          No conversations or messages match &ldquo;{query}&rdquo;. Try a different search term.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Results summary */}
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium">
          {results.length} conversation{results.length !== 1 ? 's' : ''}
        </p>
        {isSearching && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
      </div>

      {/* Result cards */}
      {results.map((result) => (
        <ResultCard
          key={result.conversation.id}
          result={result}
          query={query}
          onSelect={handleSelect}
        />
      ))}
    </div>
  )
}

function ResultCard({
  result,
  query,
  onSelect,
}: {
  result: SearchResult
  query: string
  onSelect: (id: string) => void
}) {
  const { conversation, matchingMessages, folderName, folderColor, projectName } = result

  return (
    <button
      onClick={() => onSelect(conversation.id)}
      className="group flex flex-col rounded-xl border bg-card text-left transition-all hover:shadow-md hover:border-primary/20"
    >
      {/* Card header */}
      <div className="flex items-start gap-3 px-4 pt-4 pb-2">
        <div className="rounded-lg bg-muted p-2 shrink-0 mt-0.5">
          {conversation.parentId ? (
            <GitBranch className="h-4 w-4 text-muted-foreground" />
          ) : (
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="font-medium text-sm truncate">
              <HighlightText text={conversation.title} query={query} />
            </h3>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Folder badge */}
            {folderName && (
              <Badge variant="secondary" className="h-5 gap-1 px-1.5 text-[10px] font-medium">
                <Folder
                  className="h-2.5 w-2.5"
                  style={folderColor ? { color: folderColor } : undefined}
                />
                {projectName ? `${projectName} / ${folderName}` : folderName}
              </Badge>
            )}
            {/* Project badge (if no folder) */}
            {!folderName && projectName && (
              <Badge variant="secondary" className="h-5 gap-1 px-1.5 text-[10px] font-medium">
                <Folder className="h-2.5 w-2.5" />
                {projectName}
              </Badge>
            )}
            <span className="text-[11px] text-muted-foreground">
              {conversation.messageCount} messages
            </span>
            <span className="text-[11px] text-muted-foreground">
              {formatRelativeTime(conversation.lastMessageAt)}
            </span>
          </div>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
      </div>

      {/* Matching messages from server */}
      {matchingMessages.length > 0 && (
        <div className="px-4 pb-3 pt-1">
          <div className="rounded-lg bg-muted/50 divide-y divide-border/50">
            {matchingMessages.slice(0, 3).map((msg) => (
              <SnippetPreview key={msg.id} snippet={msg} query={query} />
            ))}
          </div>
          {matchingMessages.length > 3 && (
            <p className="text-[11px] text-muted-foreground mt-2 ml-1">
              + {matchingMessages.length - 3} more match{matchingMessages.length - 3 !== 1 ? 'es' : ''} in this conversation
            </p>
          )}
        </div>
      )}
    </button>
  )
}

function SnippetPreview({ snippet, query }: { snippet: MessageSnippet; query: string }) {
  return (
    <div className="flex gap-2.5 px-3 py-2.5 text-xs">
      {/* Role indicator */}
      <div className="shrink-0 mt-0.5">
        {snippet.role === 'user' ? (
          <div className="rounded-full bg-primary/10 p-1">
            <User className="h-2.5 w-2.5 text-primary" />
          </div>
        ) : (
          <div className="rounded-full bg-muted-foreground/10 p-1">
            <Bot className="h-2.5 w-2.5 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Snippet content */}
      <div className="flex-1 min-w-0">
        <span className="font-medium text-muted-foreground mr-1">
          {snippet.role === 'user' ? 'You' : 'AI'}
        </span>
        <span className="text-muted-foreground/80 leading-relaxed">
          <HighlightText text={snippet.snippet} query={query} />
        </span>
      </div>
    </div>
  )
}

/** Highlights all occurrences of `query` within `text` */
function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>

  const lowerText = text.toLowerCase()
  const lowerQuery = query.toLowerCase()
  const parts: React.ReactNode[] = []
  let lastIndex = 0

  let matchIndex = lowerText.indexOf(lowerQuery, lastIndex)
  while (matchIndex !== -1) {
    // Text before match
    if (matchIndex > lastIndex) {
      parts.push(text.slice(lastIndex, matchIndex))
    }
    // The match itself
    parts.push(
      <mark
        key={matchIndex}
        className="bg-yellow-200/80 dark:bg-yellow-800/40 text-foreground rounded-sm px-0.5 py-px"
      >
        {text.slice(matchIndex, matchIndex + query.length)}
      </mark>
    )
    lastIndex = matchIndex + query.length
    matchIndex = lowerText.indexOf(lowerQuery, lastIndex)
  }

  // Remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return <>{parts}</>
}

'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { SearchResults } from '@/components/search/SearchResults'
import { SearchFilters } from '@/components/search/SearchFilters'
import { useConversations, useActiveWorkspaceId } from '@/stores'

function SearchPageContent() {
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get('q') ?? ''

  const [query, setQuery] = useState(initialQuery)
  const [folderId, setFolderId] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'date' | 'relevance'>('relevance')
  const activeWorkspaceId = useActiveWorkspaceId()
  const conversations = useConversations(activeWorkspaceId)

  // Sync query with URL param
  useEffect(() => {
    const q = searchParams.get('q')
    if (q && q !== query) {
      setQuery(q)
    }
  }, [searchParams]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex h-full flex-col">
      {/* Search header — compact */}
      <div className="border-b">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search conversations and messages..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 h-9"
              autoFocus
            />
          </div>
          <SearchFilters
            folderId={folderId}
            onFolderChange={setFolderId}
            sortBy={sortBy}
            onSortChange={setSortBy}
          />
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-6">
          <SearchResults
            query={query}
            conversations={conversations}
            folderId={folderId}
            sortBy={sortBy}
          />
        </div>
      </div>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center text-muted-foreground">Loading...</div>}>
      <SearchPageContent />
    </Suspense>
  )
}

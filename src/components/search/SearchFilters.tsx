'use client'

import { ArrowDownAZ, CalendarDays, Folder } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useFolders } from '@/stores'
import { cn } from '@/lib/utils'

interface SearchFiltersProps {
  folderId: string | null
  onFolderChange: (folderId: string | null) => void
  sortBy: 'date' | 'relevance'
  onSortChange: (sort: 'date' | 'relevance') => void
}

export function SearchFilters({
  folderId,
  onFolderChange,
  sortBy,
  onSortChange,
}: SearchFiltersProps) {
  const folders = useFolders()

  return (
    <div className="flex items-center gap-2">
      {/* Folder filter */}
      <Select
        value={folderId ?? '__all__'}
        onValueChange={(v) => onFolderChange(v === '__all__' ? null : v)}
      >
        <SelectTrigger className="w-[180px] h-8 text-xs">
          <Folder className="h-3.5 w-3.5 mr-1.5 shrink-0" />
          <SelectValue placeholder="All folders" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">All folders</SelectItem>
          {folders.map((folder) => (
            <SelectItem key={folder.id} value={folder.id}>
              {folder.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Sort toggle buttons */}
      <div className="flex items-center rounded-md border bg-background">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'h-8 px-3 text-xs rounded-r-none gap-1.5',
            sortBy === 'relevance' && 'bg-muted'
          )}
          onClick={() => onSortChange('relevance')}
        >
          <ArrowDownAZ className="h-3.5 w-3.5" />
          Relevance
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'h-8 px-3 text-xs rounded-l-none border-l gap-1.5',
            sortBy === 'date' && 'bg-muted'
          )}
          onClick={() => onSortChange('date')}
        >
          <CalendarDays className="h-3.5 w-3.5" />
          Recent
        </Button>
      </div>
    </div>
  )
}

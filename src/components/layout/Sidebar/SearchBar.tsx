'use client'

import { useState, useCallback } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function SearchBar({
  value,
  onChange,
  placeholder = 'Search conversations...',
  className,
}: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false)

  const handleClear = useCallback(() => {
    onChange('')
  }, [onChange])

  return (
    <div className={cn('relative', className)}>
      <Search
        className={cn(
          'absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors',
          isFocused ? 'text-primary' : 'text-muted-foreground'
        )}
      />
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className="pl-8 pr-8 h-9 bg-background"
      />
      {value && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
          onClick={handleClear}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  )
}

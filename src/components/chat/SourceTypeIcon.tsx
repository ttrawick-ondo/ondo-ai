'use client'

import { cn } from '@/lib/utils'
import type { CitationSourceType } from '@/types'

interface SourceTypeIconProps {
  type: CitationSourceType
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
}

const sourceConfig: Record<CitationSourceType, { icon: string; label: string; color: string }> = {
  confluence: {
    icon: '📄',
    label: 'Confluence',
    color: 'text-blue-600',
  },
  slack: {
    icon: '💬',
    label: 'Slack',
    color: 'text-purple-600',
  },
  github: {
    icon: '🐙',
    label: 'GitHub',
    color: 'text-gray-600',
  },
  jira: {
    icon: '🎫',
    label: 'Jira',
    color: 'text-blue-500',
  },
  gdrive: {
    icon: '📁',
    label: 'Google Drive',
    color: 'text-green-600',
  },
  notion: {
    icon: '📝',
    label: 'Notion',
    color: 'text-gray-800',
  },
  custom: {
    icon: '📎',
    label: 'Document',
    color: 'text-gray-500',
  },
}

export function SourceTypeIcon({ type, className, size = 'md' }: SourceTypeIconProps) {
  const config = sourceConfig[type] || sourceConfig.custom

  return (
    <span
      className={cn(sizeClasses[size], config.color, 'inline-flex items-center justify-center', className)}
      title={config.label}
      role="img"
      aria-label={config.label}
    >
      {config.icon}
    </span>
  )
}

export function getSourceTypeLabel(type: CitationSourceType): string {
  return sourceConfig[type]?.label || 'Document'
}

export function getSourceTypeColor(type: CitationSourceType): string {
  return sourceConfig[type]?.color || sourceConfig.custom.color
}

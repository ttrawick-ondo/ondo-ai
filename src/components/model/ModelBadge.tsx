'use client'

import { cn } from '@/lib/utils'
import { ModelIcon } from './ModelIcon'
import type { AIProvider } from '@/types'

interface ModelBadgeProps {
  modelId: string
  modelName: string
  provider: AIProvider
  className?: string
  showIcon?: boolean
}

export function ModelBadge({
  modelId,
  modelName,
  provider,
  className,
  showIcon = true,
}: ModelBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 text-[11px] text-muted-foreground',
        className
      )}
    >
      {showIcon && <ModelIcon provider={provider} size="sm" />}
      <span>{modelName}</span>
    </span>
  )
}

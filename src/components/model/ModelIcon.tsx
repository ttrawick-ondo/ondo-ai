'use client'

import { Bot, Sparkles, Search, Cpu, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AIProvider } from '@/types'

interface ModelIconProps {
  provider: AIProvider
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
}

const providerStyles: Record<AIProvider, { icon: typeof Bot; className: string }> = {
  openai: {
    icon: Sparkles,
    className: 'text-emerald-500',
  },
  anthropic: {
    icon: Bot,
    className: 'text-orange-500',
  },
  glean: {
    icon: Search,
    className: 'text-blue-500',
  },
  dust: {
    icon: Cpu,
    className: 'text-purple-500',
  },
  ondobot: {
    icon: Building2,
    className: 'text-cyan-500',
  },
}

export function ModelIcon({ provider, className, size = 'md' }: ModelIconProps) {
  const { icon: Icon, className: colorClass } = providerStyles[provider]

  return <Icon className={cn(sizeClasses[size], colorClass, className)} />
}

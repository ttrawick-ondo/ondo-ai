'use client'

import { cn } from '@/lib/utils'
import { FileText } from 'lucide-react'
import type { CitationSourceType } from '@/types'

interface SourceTypeIconProps {
  type: CitationSourceType
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeMap = {
  sm: 14,
  md: 16,
  lg: 20,
}

const sourceLabels: Record<CitationSourceType, string> = {
  confluence: 'Confluence',
  slack: 'Slack',
  github: 'GitHub',
  jira: 'Jira',
  gdrive: 'Google Drive',
  notion: 'Notion',
  custom: 'Document',
}

// Brand SVG icons — compact inline paths
function ConfluenceIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M1.26 16.8c-.24.4-.52.87-.74 1.22a.63.63 0 0 0 .2.87l4.13 2.58a.63.63 0 0 0 .87-.17c.19-.31.44-.73.72-1.2 2.04-3.47 4.07-3.04 7.79-1.37l4.03 1.81a.63.63 0 0 0 .84-.3l2-4.48a.63.63 0 0 0-.3-.82c-.72-.33-2.14-.97-4.03-1.82-6.67-3-11.3-2.55-15.5 3.68Z" fill="#1868DB" />
      <path d="M22.74 7.2c.24-.4.52-.87.74-1.22a.63.63 0 0 0-.2-.87L19.14 2.53a.63.63 0 0 0-.87.17c-.19.31-.44.73-.72 1.2-2.04 3.47-4.07 3.04-7.79 1.37L5.73 3.46a.63.63 0 0 0-.84.3l-2 4.48a.63.63 0 0 0 .3.82c.72.33 2.14.97 4.03 1.82 6.67 3 11.3 2.55 15.5-3.68Z" fill="#1868DB" />
    </svg>
  )
}

function SlackIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M5.04 15.16a2.1 2.1 0 1 1-2.1-2.1h2.1v2.1Zm1.06 0a2.1 2.1 0 1 1 4.2 0v5.25a2.1 2.1 0 1 1-4.2 0v-5.25Z" fill="#E01E5A" />
      <path d="M8.84 5.04a2.1 2.1 0 1 1 2.1-2.1v2.1h-2.1Zm0 1.06a2.1 2.1 0 1 1 0 4.2H3.59a2.1 2.1 0 1 1 0-4.2h5.25Z" fill="#36C5F0" />
      <path d="M18.96 8.84a2.1 2.1 0 1 1 2.1 2.1h-2.1V8.84Zm-1.06 0a2.1 2.1 0 1 1-4.2 0V3.59a2.1 2.1 0 1 1 4.2 0v5.25Z" fill="#2EB67D" />
      <path d="M15.16 18.96a2.1 2.1 0 1 1-2.1 2.1v-2.1h2.1Zm0-1.06a2.1 2.1 0 1 1 0-4.2h5.25a2.1 2.1 0 1 1 0 4.2h-5.25Z" fill="#ECB22E" />
    </svg>
  )
}

function GitHubIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" />
    </svg>
  )
}

function JiraIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M22.16 11.1 13.3 2.26 12 .96 4.63 8.33l-2.8 2.78a.66.66 0 0 0 0 .94l6.43 6.43L12 22.2l7.37-7.37.1-.1 2.69-2.69a.66.66 0 0 0 0-.94ZM12 15.37 8.63 12 12 8.63 15.37 12 12 15.37Z" fill="#2684FF" />
      <path d="M12 8.63A4.74 4.74 0 0 1 11.96 2L4.6 9.36l3.37 3.37L12 8.63Z" fill="url(#jira-a)" />
      <path d="M15.4 11.97 12 15.37a4.74 4.74 0 0 1 0 6.66l7.4-7.4-4.4-2.66Z" fill="url(#jira-b)" />
      <defs>
        <linearGradient id="jira-a" x1="11.36" y1="5.58" x2="6.76" y2="10.12" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0052CC" />
          <stop offset="1" stopColor="#2684FF" />
        </linearGradient>
        <linearGradient id="jira-b" x1="12.68" y1="18.32" x2="17.28" y2="13.79" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0052CC" />
          <stop offset="1" stopColor="#2684FF" />
        </linearGradient>
      </defs>
    </svg>
  )
}

function GoogleDriveIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="m8.27 2.5 4.05 7.02H3.5l4.06-7.02h.71Z" fill="#0066DA" />
      <path d="M16.44 2.5 8.27 16.55l-2.38-4.13L12.32 2.5h4.12Z" fill="#00AC47" />
      <path d="m20.5 16.55-4.06-7.03-4.12 7.03H20.5Z" fill="#EA4335" />
      <path d="M12.32 9.52 16.44 2.5l4.06 7.02-4.06 7.03h-8.2l4.08-7.03Z" fill="#00832D" />
      <path d="m3.5 16.55 4.06 7.02 2.37-4.12-4.06-7.03L3.5 16.55Z" fill="#2684FC" />
      <path d="m16.44 23.57-4.06-7.02H3.5l4.77-.01 8.17.01Z" fill="#FFBA00" />
    </svg>
  )
}

function NotionIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M4.46 3.3c.6.49.83.46 1.97.38l10.7-.64c.23 0 .04-.23-.04-.26l-1.78-1.28c-.34-.26-.8-.55-1.67-.49L3.32 2c-.56.04-.68.34-.45.57l1.59.73Zm.63 2.26v11.24c0 .6.3.83.97.79l11.75-.68c.68-.04.76-.45.76-.94V4.84c0-.49-.19-.72-.6-.68l-12.28.71c-.45.04-.6.26-.6.68Zm11.6.68c.08.34 0 .68-.34.72l-.56.11v8.28c-.49.26-.95.41-1.33.41-.6 0-.76-.19-1.2-.75L10.6 9.52v5.12l1.17.26s0 .68-.94.68l-2.6.15c-.08-.15 0-.53.27-.6l.68-.19V7.72l-.94-.08c-.08-.34.11-.83.6-.87l2.79-.18 3.82 5.84V7.94l-.98-.11c-.08-.41.23-.72.6-.76l2.63-.15.02.02Zm-14-4.87L13.54.65c.86-.08 1.08-.04 1.63.38l2.26 1.58c.42.3.56.38.56.72v13.39c0 .72-.26 1.13-1.2 1.2l-12.5.74c-.7.04-1.04-.08-1.4-.53L.94 15.64c-.38-.49-.56-.86-.56-1.32V2.54c0-.57.27-1.06 1.01-1.17h-.26Z" />
    </svg>
  )
}

const iconComponents: Record<CitationSourceType, React.FC<{ size: number }>> = {
  confluence: ConfluenceIcon,
  slack: SlackIcon,
  github: GitHubIcon,
  jira: JiraIcon,
  gdrive: GoogleDriveIcon,
  notion: NotionIcon,
  custom: ({ size }) => <FileText width={size} height={size} className="text-muted-foreground" />,
}

export function SourceTypeIcon({ type, className, size = 'md' }: SourceTypeIconProps) {
  const label = sourceLabels[type] || sourceLabels.custom
  const IconComponent = iconComponents[type] || iconComponents.custom
  const px = sizeMap[size]

  return (
    <span
      className={cn('inline-flex items-center justify-center shrink-0', className)}
      title={label}
      role="img"
      aria-label={label}
    >
      <IconComponent size={px} />
    </span>
  )
}

export function getSourceTypeLabel(type: CitationSourceType): string {
  return sourceLabels[type] || 'Document'
}

export function getSourceTypeColor(type: CitationSourceType): string {
  // Kept for backwards compat but no longer used for rendering
  const colors: Record<CitationSourceType, string> = {
    confluence: 'text-blue-600',
    slack: 'text-purple-600',
    github: 'text-gray-600',
    jira: 'text-blue-500',
    gdrive: 'text-green-600',
    notion: 'text-gray-800',
    custom: 'text-gray-500',
  }
  return colors[type] || colors.custom
}

'use client'

import { Skeleton } from '@/components/ui/skeleton'

interface SidebarSkeletonProps {
  showPinned?: boolean
  projectCount?: number
  conversationCount?: number
}

export function SidebarSkeleton({
  showPinned = true,
  projectCount = 2,
  conversationCount = 4,
}: SidebarSkeletonProps) {
  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300">
      {/* Search skeleton */}
      <div className="p-2">
        <Skeleton className="h-9 w-full" />
      </div>

      {/* Quick filters skeleton */}
      <div className="px-2 pb-2 flex gap-1">
        <Skeleton className="h-6 w-14" />
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-12" />
      </div>

      <div className="h-px bg-border" />

      {/* Scrollable content */}
      <div className="flex-1 overflow-hidden">
        {/* Pinned section skeleton */}
        {showPinned && (
          <>
            <div className="p-2">
              <div className="px-2 py-1.5 flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-3 w-4 ml-auto" />
              </div>
              {[...Array(2)].map((_, i) => (
                <ConversationSkeleton key={`pinned-${i}`} depth={0} />
              ))}
            </div>
            <div className="h-px bg-border" />
          </>
        )}

        {/* Projects section skeleton */}
        <div className="p-2">
          <div className="px-2 py-1.5 flex items-center justify-between">
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-5 w-5" />
          </div>
          {[...Array(projectCount)].map((_, i) => (
            <ProjectSkeleton key={`project-${i}`} />
          ))}
        </div>

        <div className="h-px bg-border" />

        {/* Recent section skeleton */}
        <div className="p-2">
          <div className="px-2 py-1.5 flex items-center gap-1.5">
            <Skeleton className="h-3.5 w-3.5" />
            <Skeleton className="h-3 w-12" />
          </div>
          {[...Array(conversationCount)].map((_, i) => (
            <ConversationSkeleton key={`recent-${i}`} depth={0} />
          ))}
        </div>
      </div>
    </div>
  )
}

function ProjectSkeleton() {
  return (
    <div className="py-1">
      <div className="flex items-center gap-1 px-2 py-1.5">
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-3 w-3 rounded-full" />
        <Skeleton className="h-4 flex-1 max-w-[140px]" />
        <Skeleton className="h-3 w-6" />
      </div>
    </div>
  )
}

function ConversationSkeleton({ depth = 0 }: { depth?: number }) {
  return (
    <div
      className="flex items-center gap-2 px-2 py-1.5"
      style={{ paddingLeft: `${8 + depth * 12}px` }}
    >
      <Skeleton className="h-3.5 w-3.5" />
      <Skeleton className="h-4 flex-1 max-w-[180px]" />
      <Skeleton className="h-3 w-10" />
    </div>
  )
}

export function FolderSkeleton({ depth = 0 }: { depth?: number }) {
  return (
    <div className="py-0.5">
      <div
        className="flex items-center gap-1.5 px-2 py-1"
        style={{ paddingLeft: `${8 + depth * 12}px` }}
      >
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 flex-1 max-w-[120px]" />
      </div>
    </div>
  )
}

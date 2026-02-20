'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MessageSquare, Folder, Library, Settings, Bot } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const navItems = [
  {
    label: 'Chat',
    href: '/chat',
    icon: MessageSquare,
  },
  {
    label: 'Folders',
    href: '/projects',
    icon: Folder,
  },
  {
    label: 'Prompts',
    href: '/prompts',
    icon: Library,
  },
  {
    label: 'Agents',
    href: '/agents',
    icon: Bot,
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: Settings,
  },
]

export function SidebarNav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-1 p-2">
      {navItems.map((item) => {
        const isActive = pathname.startsWith(item.href)
        return (
          <Button
            key={item.href}
            variant={isActive ? 'secondary' : 'ghost'}
            className={cn(
              'justify-start h-9',
              isActive && 'bg-secondary'
            )}
            asChild
          >
            <Link href={item.href}>
              <item.icon className="h-4 w-4 mr-2" />
              {item.label}
            </Link>
          </Button>
        )
      })}
    </nav>
  )
}

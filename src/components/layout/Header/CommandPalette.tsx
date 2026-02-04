'use client'

import { useRouter } from 'next/navigation'
import {
  MessageSquare,
  FolderKanban,
  Library,
  Settings,
  Plus,
  Search,
} from 'lucide-react'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  useCommandPaletteOpen,
  useUIActions,
  useConversations,
  useProjects,
  usePrompts,
  useChatActions,
} from '@/stores'

export function CommandPalette() {
  const router = useRouter()
  const open = useCommandPaletteOpen()
  const { setCommandPaletteOpen } = useUIActions()
  const conversations = useConversations()
  const projects = useProjects()
  const prompts = usePrompts()
  const { createConversation, setActiveConversation } = useChatActions()

  const handleSelect = (callback: () => void) => {
    callback()
    setCommandPaletteOpen(false)
  }

  const handleNewChat = async () => {
    const id = await createConversation()
    setActiveConversation(id)
    router.push(`/chat/${id}`)
  }

  return (
    <CommandDialog open={open} onOpenChange={setCommandPaletteOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => handleSelect(handleNewChat)}>
            <Plus className="mr-2 h-4 w-4" />
            New Chat
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => router.push('/projects'))}>
            <FolderKanban className="mr-2 h-4 w-4" />
            View Projects
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => router.push('/prompts'))}>
            <Library className="mr-2 h-4 w-4" />
            Browse Prompts
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => router.push('/settings'))}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Recent Conversations">
          {conversations.slice(0, 5).map((conv) => (
            <CommandItem
              key={conv.id}
              onSelect={() =>
                handleSelect(() => {
                  setActiveConversation(conv.id)
                  router.push(`/chat/${conv.id}`)
                })
              }
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              {conv.title}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Projects">
          {projects.slice(0, 5).map((project) => (
            <CommandItem
              key={project.id}
              onSelect={() =>
                handleSelect(() => router.push(`/projects/${project.id}`))
              }
            >
              <div
                className="mr-2 h-3 w-3 rounded-full"
                style={{ backgroundColor: project.color }}
              />
              {project.name}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Prompts">
          {prompts.slice(0, 5).map((prompt) => (
            <CommandItem
              key={prompt.id}
              onSelect={() =>
                handleSelect(() => router.push(`/prompts/${prompt.id}`))
              }
            >
              <Library className="mr-2 h-4 w-4" />
              {prompt.title}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}

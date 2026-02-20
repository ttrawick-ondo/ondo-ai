'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  MessageSquare,
  Folder,
  Library,
  Settings,
  Plus,
  Search,
} from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import {
  Command,
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
  useFolders,
  useChatActions,
  useActiveWorkspaceId,
} from '@/stores'
import { usePrompts as usePromptsQuery } from '@/lib/queries'

const ALWAYS_SHOW_PREFIX = 'search-all'

export function CommandPalette() {
  const router = useRouter()
  const open = useCommandPaletteOpen()
  const { setCommandPaletteOpen } = useUIActions()
  const activeWorkspaceId = useActiveWorkspaceId()
  const conversations = useConversations(activeWorkspaceId)
  const folders = useFolders()
  const { data: prompts = [] } = usePromptsQuery({ userId: 'user-1' }) // TODO: Get from auth
  const { createConversation, setActiveConversation } = useChatActions()

  const [inputValue, setInputValue] = useState('')

  const handleSelect = (callback: () => void) => {
    callback()
    setCommandPaletteOpen(false)
    setInputValue('')
  }

  const handleNewChat = async () => {
    const id = await createConversation(undefined, undefined, undefined, null, activeWorkspaceId)
    setActiveConversation(id)
    router.push(`/chat/${id}`)
  }

  const handleSearchAll = useCallback(() => {
    const q = inputValue.trim()
    setCommandPaletteOpen(false)
    setInputValue('')
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : '/search')
  }, [inputValue, router, setCommandPaletteOpen])

  // Custom filter: always show the "Search conversations" item, normal matching for rest
  const filter = useCallback((value: string, search: string) => {
    if (value.startsWith(ALWAYS_SHOW_PREFIX)) return 1
    if (value.toLowerCase().includes(search.toLowerCase())) return 1
    return 0
  }, [])

  return (
    <Dialog open={open} onOpenChange={(v) => { setCommandPaletteOpen(v); if (!v) setInputValue('') }}>
      <DialogContent className="overflow-hidden p-0">
        <Command
          filter={filter}
          className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5"
        >
          <CommandInput
            placeholder="Type a command or search..."
            value={inputValue}
            onValueChange={setInputValue}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && inputValue.trim() && !document.querySelector('[cmdk-item][data-selected="true"]')) {
                e.preventDefault()
                handleSearchAll()
              }
            }}
          />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>

            {/* Search action — always visible via ALWAYS_SHOW_PREFIX in filter */}
            {inputValue.trim() && (
              <CommandGroup heading="Search">
                <CommandItem value={ALWAYS_SHOW_PREFIX} onSelect={() => handleSelect(handleSearchAll)}>
                  <Search className="mr-2 h-4 w-4" />
                  Search all conversations for &ldquo;{inputValue.trim()}&rdquo;
                </CommandItem>
              </CommandGroup>
            )}

            <CommandGroup heading="Actions">
              <CommandItem value="new chat" onSelect={() => handleSelect(handleNewChat)}>
                <Plus className="mr-2 h-4 w-4" />
                New Chat
              </CommandItem>
              <CommandItem value="view folders" onSelect={() => handleSelect(() => router.push('/projects'))}>
                <Folder className="mr-2 h-4 w-4" />
                View Folders
              </CommandItem>
              <CommandItem value="browse prompts" onSelect={() => handleSelect(() => router.push('/prompts'))}>
                <Library className="mr-2 h-4 w-4" />
                Browse Prompts
              </CommandItem>
              <CommandItem value="settings" onSelect={() => handleSelect(() => router.push('/settings'))}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />

            {conversations.length > 0 && (
              <CommandGroup heading="Recent Conversations">
                {conversations.slice(0, 5).map((conv) => (
                  <CommandItem
                    key={conv.id}
                    value={`${conv.id} ${conv.title}`}
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
            )}

            <CommandSeparator />

            {folders.length > 0 && (
              <CommandGroup heading="Folders">
                {folders.slice(0, 5).map((folder) => (
                  <CommandItem
                    key={folder.id}
                    value={`${folder.id} ${folder.name}`}
                    onSelect={() =>
                      handleSelect(() => router.push(`/projects/${folder.id}`))
                    }
                  >
                    <Folder
                      className="mr-2 h-4 w-4"
                      style={{ color: folder.color ?? undefined }}
                    />
                    {folder.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            <CommandSeparator />

            {prompts.length > 0 && (
              <CommandGroup heading="Prompts">
                {prompts.slice(0, 5).map((prompt) => (
                  <CommandItem
                    key={prompt.id}
                    value={`${prompt.id} ${prompt.title}`}
                    onSelect={() =>
                      handleSelect(() => router.push(`/prompts/${prompt.id}`))
                    }
                  >
                    <Library className="mr-2 h-4 w-4" />
                    {prompt.title}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  )
}

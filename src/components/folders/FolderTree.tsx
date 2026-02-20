'use client'

import { useCallback } from 'react'
import { FolderItem } from './FolderItem'
import { ConversationItem } from './ConversationItem'
import { useFolderExpanded, useFolderActions } from '@/stores'
import type { FolderTreeNode, Conversation } from '@/types'

interface FolderTreeProps {
  folders: FolderTreeNode[]
  conversations: Record<string, Conversation>
  branchesByParent?: Record<string, Conversation[]>
  onSelectConversation: (id: string) => void
  onSelectFolder?: (id: string) => void
  selectedConversationId?: string | null
  selectedFolderId?: string | null
  onEditFolder?: (id: string) => void
  onDeleteFolder?: (id: string) => void
  onCreateSubfolder?: (parentId: string) => void
  onNewChat?: (folderId: string) => void
  onMoveFolder?: (id: string) => void
  onRenameConversation?: (id: string, newTitle: string) => void
  onDeleteConversation?: (id: string) => void
  onPinConversation?: (id: string) => void
  onMoveConversation?: (id: string) => void
  onBranchConversation?: (id: string, messageId: string) => void
  projectId?: string
  enableDragDrop?: boolean
}

export function FolderTree({
  folders,
  conversations,
  branchesByParent,
  onSelectConversation,
  onSelectFolder,
  selectedConversationId,
  selectedFolderId,
  onEditFolder,
  onDeleteFolder,
  onCreateSubfolder,
  onNewChat,
  onMoveFolder,
  onRenameConversation,
  onDeleteConversation,
  onPinConversation,
  onMoveConversation,
  projectId,
  enableDragDrop = false,
}: FolderTreeProps) {
  return (
    <div className="flex flex-col gap-0.5">
      {folders.map((folder) => (
        <FolderTreeNode
          key={folder.id}
          folder={folder}
          conversations={conversations}
          branchesByParent={branchesByParent}
          onSelectConversation={onSelectConversation}
          onSelectFolder={onSelectFolder}
          selectedConversationId={selectedConversationId}
          selectedFolderId={selectedFolderId}
          onEditFolder={onEditFolder}
          onDeleteFolder={onDeleteFolder}
          onCreateSubfolder={onCreateSubfolder}
          onNewChat={onNewChat}
          onMoveFolder={onMoveFolder}
          onRenameConversation={onRenameConversation}
          onDeleteConversation={onDeleteConversation}
          onPinConversation={onPinConversation}
          onMoveConversation={onMoveConversation}
          projectId={projectId}
          enableDragDrop={enableDragDrop}
        />
      ))}
    </div>
  )
}

interface FolderTreeNodeProps {
  folder: FolderTreeNode
  conversations: Record<string, Conversation>
  branchesByParent?: Record<string, Conversation[]>
  onSelectConversation: (id: string) => void
  onSelectFolder?: (id: string) => void
  selectedConversationId?: string | null
  selectedFolderId?: string | null
  onEditFolder?: (id: string) => void
  onDeleteFolder?: (id: string) => void
  onCreateSubfolder?: (parentId: string) => void
  onNewChat?: (folderId: string) => void
  onMoveFolder?: (id: string) => void
  onRenameConversation?: (id: string, newTitle: string) => void
  onDeleteConversation?: (id: string) => void
  onPinConversation?: (id: string) => void
  onMoveConversation?: (id: string) => void
  projectId?: string
  enableDragDrop?: boolean
}

function FolderTreeNode({
  folder,
  conversations,
  branchesByParent,
  onSelectConversation,
  onSelectFolder,
  selectedConversationId,
  selectedFolderId,
  onEditFolder,
  onDeleteFolder,
  onCreateSubfolder,
  onNewChat,
  onMoveFolder,
  onRenameConversation,
  onDeleteConversation,
  onPinConversation,
  onMoveConversation,
  projectId,
  enableDragDrop = false,
}: FolderTreeNodeProps) {
  const isExpanded = useFolderExpanded(folder.id)
  const { toggleFolderExpanded } = useFolderActions()

  const handleToggle = useCallback(() => {
    toggleFolderExpanded(folder.id)
  }, [folder.id, toggleFolderExpanded])

  // Get conversations for this folder (exclude branches — they render nested under parent)
  const folderConversations = folder.conversations
    .map((id) => conversations[id])
    .filter((c) => c && !c.parentId)
    .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())

  return (
    <FolderItem
      folder={folder}
      isExpanded={isExpanded}
      onToggle={handleToggle}
      onSelect={onSelectFolder}
      onEdit={onEditFolder}
      onDelete={onDeleteFolder}
      onCreateSubfolder={onCreateSubfolder}
      onNewChat={onNewChat}
      onMove={onMoveFolder}
      isSelected={folder.id === selectedFolderId}
      projectId={projectId}
      enableDragDrop={enableDragDrop}
    >
      {/* Render subfolders */}
      {folder.children.map((childFolder) => (
        <FolderTreeNode
          key={childFolder.id}
          folder={childFolder}
          conversations={conversations}
          branchesByParent={branchesByParent}
          onSelectConversation={onSelectConversation}
          onSelectFolder={onSelectFolder}
          selectedConversationId={selectedConversationId}
          selectedFolderId={selectedFolderId}
          onEditFolder={onEditFolder}
          onDeleteFolder={onDeleteFolder}
          onCreateSubfolder={onCreateSubfolder}
          onNewChat={onNewChat}
          onMoveFolder={onMoveFolder}
          onRenameConversation={onRenameConversation}
          onDeleteConversation={onDeleteConversation}
          onPinConversation={onPinConversation}
          onMoveConversation={onMoveConversation}
          projectId={projectId}
          enableDragDrop={enableDragDrop}
        />
      ))}

      {/* Render conversations in this folder */}
      {folderConversations.map((conv) => (
        <ConversationItem
          key={conv.id}
          conversation={conv}
          depth={folder.depth + 1}
          isSelected={conv.id === selectedConversationId}
          onSelect={() => onSelectConversation(conv.id)}
          onRename={onRenameConversation}
          onRenameConversation={onRenameConversation}
          onDelete={onDeleteConversation ? () => onDeleteConversation(conv.id) : undefined}
          onPin={onPinConversation ? () => onPinConversation(conv.id) : undefined}
          onMove={onMoveConversation ? () => onMoveConversation(conv.id) : undefined}
          branches={branchesByParent?.[conv.id]}
          selectedConversationId={selectedConversationId}
          onSelectConversation={onSelectConversation}
          onDeleteConversation={onDeleteConversation}
          onPinConversation={onPinConversation}
          onMoveConversation={onMoveConversation}
          enableDragDrop={enableDragDrop}
        />
      ))}
    </FolderItem>
  )
}

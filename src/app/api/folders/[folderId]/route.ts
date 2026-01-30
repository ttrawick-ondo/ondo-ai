import { NextRequest, NextResponse } from 'next/server'
import {
  getFolder,
  getFolderWithChildren,
  updateFolder,
  deleteFolder,
  moveFolder,
} from '@/lib/db/services/folder'

interface RouteParams {
  params: Promise<{
    folderId: string
  }>
}

// GET /api/folders/[folderId] - Get a single folder
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { folderId } = await params
    const { searchParams } = new URL(request.url)
    const includeChildren = searchParams.get('children') === 'true'

    if (includeChildren) {
      const folder = await getFolderWithChildren(folderId)
      if (!folder) {
        return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
      }
      return NextResponse.json({ data: folder })
    }

    const folder = await getFolder(folderId)
    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
    }
    return NextResponse.json({ data: folder })
  } catch (error) {
    console.error('Error fetching folder:', error)
    return NextResponse.json(
      { error: 'Failed to fetch folder' },
      { status: 500 }
    )
  }
}

// PATCH /api/folders/[folderId] - Update a folder
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { folderId } = await params
    const body = await request.json()
    const { name, color, icon, position, parentId, move } = body

    // Check if this is a move operation
    if (move) {
      const { targetParentId, targetPosition } = move
      const folder = await moveFolder(
        folderId,
        targetParentId ?? null,
        targetPosition
      )
      return NextResponse.json({ data: folder })
    }

    const folder = await updateFolder(folderId, {
      name,
      color,
      icon,
      position,
      parentId,
    })

    return NextResponse.json({ data: folder })
  } catch (error) {
    console.error('Error updating folder:', error)
    return NextResponse.json(
      { error: 'Failed to update folder' },
      { status: 500 }
    )
  }
}

// DELETE /api/folders/[folderId] - Delete a folder
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { folderId } = await params
    await deleteFolder(folderId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting folder:', error)
    return NextResponse.json(
      { error: 'Failed to delete folder' },
      { status: 500 }
    )
  }
}

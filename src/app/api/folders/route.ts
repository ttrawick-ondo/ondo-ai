import { NextRequest, NextResponse } from 'next/server'
import {
  createFolder,
  getProjectFolders,
  getFolderTree,
} from '@/lib/db/services/folder'

// GET /api/folders?projectId=xxx - Get folders for a project
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const tree = searchParams.get('tree') === 'true'

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      )
    }

    if (tree) {
      const folderTree = await getFolderTree(projectId)
      return NextResponse.json({ data: folderTree })
    }

    const folders = await getProjectFolders(projectId)
    return NextResponse.json({ data: folders })
  } catch (error) {
    console.error('Error fetching folders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch folders' },
      { status: 500 }
    )
  }
}

// POST /api/folders - Create a new folder
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { projectId, parentId, name, color, icon, position } = body

    if (!projectId || !name) {
      return NextResponse.json(
        { error: 'projectId and name are required' },
        { status: 400 }
      )
    }

    const folder = await createFolder({
      projectId,
      parentId: parentId || null,
      name,
      color,
      icon,
      position,
    })

    return NextResponse.json({ data: folder }, { status: 201 })
  } catch (error) {
    console.error('Error creating folder:', error)
    return NextResponse.json(
      { error: 'Failed to create folder' },
      { status: 500 }
    )
  }
}

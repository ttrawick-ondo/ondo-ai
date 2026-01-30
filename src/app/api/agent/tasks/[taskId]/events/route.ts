import { NextRequest, NextResponse } from 'next/server'
import { addTaskEvent, getTaskWithEvents, type TaskEventData } from '@/lib/db/services/agent-task'
import { agentLogger } from '@/lib/logging'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params
    const task = await getTaskWithEvents(taskId)

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    return NextResponse.json({ events: task.events })
  } catch (error) {
    agentLogger.error('Failed to get task events', error instanceof Error ? error : { error })
    return NextResponse.json(
      { error: 'Failed to get task events' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params
    const body = await request.json()

    const eventData: TaskEventData = {
      type: body.type,
      data: body.data,
    }

    const event = await addTaskEvent(taskId, eventData)

    return NextResponse.json({ event }, { status: 201 })
  } catch (error) {
    agentLogger.error('Failed to add task event', error instanceof Error ? error : { error })
    return NextResponse.json(
      { error: 'Failed to add task event' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getTaskWithEvents, updateTask, type UpdateTaskInput } from '@/lib/db/services/agent-task'
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

    return NextResponse.json({ task })
  } catch (error) {
    agentLogger.error('Failed to get task', error instanceof Error ? error : { error })
    return NextResponse.json(
      { error: 'Failed to get task' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params
    const body = await request.json()

    const updateData: UpdateTaskInput = {}
    if (body.status !== undefined) updateData.status = body.status
    if (body.iterations !== undefined) updateData.iterations = body.iterations
    if (body.toolsUsed !== undefined) updateData.toolsUsed = body.toolsUsed
    if (body.changes !== undefined) updateData.changes = body.changes
    if (body.success !== undefined) updateData.success = body.success
    if (body.summary !== undefined) updateData.summary = body.summary
    if (body.error !== undefined) updateData.error = body.error
    if (body.startedAt !== undefined) updateData.startedAt = new Date(body.startedAt)
    if (body.completedAt !== undefined) updateData.completedAt = new Date(body.completedAt)

    const task = await updateTask(taskId, updateData)

    agentLogger.debug('Agent task updated', {
      taskId: task.id,
      status: task.status,
    })

    return NextResponse.json({ task })
  } catch (error) {
    agentLogger.error('Failed to update task', error instanceof Error ? error : { error })
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    )
  }
}

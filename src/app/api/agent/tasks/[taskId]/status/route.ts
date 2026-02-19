import { NextRequest, NextResponse } from 'next/server'
import { updateTask, type TaskStatus } from '@/lib/db/services/agent-task'
import { agentLogger } from '@/lib/logging'
import { requireSession, unauthorizedResponse } from '@/lib/auth/session'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await requireSession()
    if (!session) return unauthorizedResponse()

    const { taskId } = await params
    const body = await request.json()
    const status = body.status as TaskStatus

    const task = await updateTask(taskId, { status })

    agentLogger.info('Agent task status updated', {
      taskId: task.id,
      status: task.status,
    })

    return NextResponse.json({ task })
  } catch (error) {
    agentLogger.error('Failed to update task status', error instanceof Error ? error : { error })
    return NextResponse.json(
      { error: 'Failed to update task status' },
      { status: 500 }
    )
  }
}

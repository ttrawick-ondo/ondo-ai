import { NextRequest, NextResponse } from 'next/server'
import { updateTask, type UpdateTaskInput } from '@/lib/db/services/agent-task'
import { agentLogger } from '@/lib/logging'
import { requireSession, unauthorizedResponse } from '@/lib/auth/session'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await requireSession()
    if (!session) return unauthorizedResponse()

    const { taskId } = await params
    const body = await request.json()

    const updateData: UpdateTaskInput = {
      success: body.success,
      summary: body.summary,
      iterations: body.iterations,
      toolsUsed: body.toolsUsed?.map((t: { toolName: string }) => t.toolName),
      changes: body.changes,
      error: body.error,
      completedAt: new Date(),
      status: body.success ? 'completed' : 'failed',
    }

    const task = await updateTask(taskId, updateData)

    agentLogger.info('Agent task result recorded', {
      taskId: task.id,
      success: body.success,
      iterations: body.iterations,
      changesCount: body.changes?.length,
    })

    return NextResponse.json({ task })
  } catch (error) {
    agentLogger.error('Failed to record task result', error instanceof Error ? error : { error })
    return NextResponse.json(
      { error: 'Failed to record task result' },
      { status: 500 }
    )
  }
}

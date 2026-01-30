import { NextRequest, NextResponse } from 'next/server'
import {
  createTask,
  getTasks,
  getTaskStatistics,
  type CreateTaskInput,
  type TaskFilter,
} from '@/lib/db/services/agent-task'
import { agentLogger } from '@/lib/logging'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    const type = searchParams.get('type') as TaskFilter['type'] | null
    const status = searchParams.get('status') as TaskFilter['status'] | null
    const stats = searchParams.get('stats') === 'true'

    if (stats) {
      const statistics = await getTaskStatistics()
      return NextResponse.json({ statistics })
    }

    const filter: TaskFilter = {}
    if (type) filter.type = type
    if (status) filter.status = status

    const tasks = await getTasks(filter, limit, offset)

    return NextResponse.json({ tasks })
  } catch (error) {
    agentLogger.error('Failed to get tasks', error instanceof Error ? error : { error })
    return NextResponse.json(
      { error: 'Failed to get tasks' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const input: CreateTaskInput = {
      type: body.type,
      title: body.title,
      description: body.description,
      priority: body.priority,
      agentRole: body.agentRole,
    }

    const task = await createTask(input)

    agentLogger.info('Agent task created', {
      taskId: task.id,
      type: task.type,
      title: task.title,
    })

    return NextResponse.json({ task }, { status: 201 })
  } catch (error) {
    agentLogger.error('Failed to create task', error instanceof Error ? error : { error })
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    )
  }
}

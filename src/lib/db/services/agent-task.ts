import { prisma } from '../index'
import type { AgentTask, AgentTaskEvent } from '@/generated/prisma'

export type TaskStatus = 'pending' | 'awaiting_approval' | 'running' | 'completed' | 'failed' | 'cancelled'
export type TaskType = 'test' | 'qa' | 'feature' | 'refactor' | 'docs' | 'security'

export interface CreateTaskInput {
  type: TaskType
  title: string
  description: string
  priority?: number
  agentRole?: string
}

export interface UpdateTaskInput {
  status?: TaskStatus
  iterations?: number
  toolsUsed?: string[]
  changes?: Array<{ file: string; type: string; description?: string }>
  success?: boolean
  summary?: string
  error?: string
  startedAt?: Date
  completedAt?: Date
}

export interface TaskFilter {
  type?: TaskType
  status?: TaskStatus
  agentRole?: string
  fromDate?: Date
  toDate?: Date
}

export interface TaskEventData {
  type: string
  data?: Record<string, unknown>
}

/**
 * Create a new agent task
 */
export async function createTask(input: CreateTaskInput): Promise<AgentTask> {
  return prisma.agentTask.create({
    data: {
      type: input.type,
      title: input.title,
      description: input.description,
      priority: input.priority ?? 0,
      agentRole: input.agentRole,
      status: 'pending',
    },
  })
}

/**
 * Get a task by ID
 */
export async function getTaskById(taskId: string): Promise<AgentTask | null> {
  return prisma.agentTask.findUnique({
    where: { id: taskId },
  })
}

/**
 * Get a task with all events
 */
export async function getTaskWithEvents(taskId: string): Promise<(AgentTask & { events: AgentTaskEvent[] }) | null> {
  return prisma.agentTask.findUnique({
    where: { id: taskId },
    include: {
      events: {
        orderBy: { createdAt: 'asc' },
      },
    },
  })
}

/**
 * Update a task
 */
export async function updateTask(taskId: string, input: UpdateTaskInput): Promise<AgentTask> {
  const updateData: Record<string, unknown> = {}

  if (input.status !== undefined) updateData.status = input.status
  if (input.iterations !== undefined) updateData.iterations = input.iterations
  if (input.toolsUsed !== undefined) updateData.toolsUsed = JSON.stringify(input.toolsUsed)
  if (input.changes !== undefined) updateData.changes = JSON.stringify(input.changes)
  if (input.success !== undefined) updateData.success = input.success
  if (input.summary !== undefined) updateData.summary = input.summary
  if (input.error !== undefined) updateData.error = input.error
  if (input.startedAt !== undefined) updateData.startedAt = input.startedAt
  if (input.completedAt !== undefined) updateData.completedAt = input.completedAt

  return prisma.agentTask.update({
    where: { id: taskId },
    data: updateData,
  })
}

/**
 * Add an event to a task
 */
export async function addTaskEvent(taskId: string, event: TaskEventData): Promise<AgentTaskEvent> {
  return prisma.agentTaskEvent.create({
    data: {
      taskId,
      type: event.type,
      data: event.data ? JSON.stringify(event.data) : null,
    },
  })
}

/**
 * Get tasks with optional filtering
 */
export async function getTasks(filter?: TaskFilter, limit = 50, offset = 0): Promise<AgentTask[]> {
  const where: Record<string, unknown> = {}

  if (filter?.type) where.type = filter.type
  if (filter?.status) where.status = filter.status
  if (filter?.agentRole) where.agentRole = filter.agentRole

  if (filter?.fromDate || filter?.toDate) {
    where.createdAt = {}
    if (filter.fromDate) (where.createdAt as Record<string, Date>).gte = filter.fromDate
    if (filter.toDate) (where.createdAt as Record<string, Date>).lte = filter.toDate
  }

  return prisma.agentTask.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  })
}

/**
 * Count tasks matching filter
 */
export async function countTasks(filter?: TaskFilter): Promise<number> {
  const where: Record<string, unknown> = {}

  if (filter?.type) where.type = filter.type
  if (filter?.status) where.status = filter.status
  if (filter?.agentRole) where.agentRole = filter.agentRole

  if (filter?.fromDate || filter?.toDate) {
    where.createdAt = {}
    if (filter.fromDate) (where.createdAt as Record<string, Date>).gte = filter.fromDate
    if (filter.toDate) (where.createdAt as Record<string, Date>).lte = filter.toDate
  }

  return prisma.agentTask.count({ where })
}

/**
 * Get recent task history
 */
export async function getRecentTasks(limit = 10): Promise<AgentTask[]> {
  return prisma.agentTask.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

/**
 * Get task statistics
 */
export async function getTaskStatistics(): Promise<{
  total: number
  byStatus: Record<string, number>
  byType: Record<string, number>
  successRate: number
  avgIterations: number
}> {
  const [total, byStatus, byType, completed] = await Promise.all([
    prisma.agentTask.count(),
    prisma.agentTask.groupBy({
      by: ['status'],
      _count: true,
    }),
    prisma.agentTask.groupBy({
      by: ['type'],
      _count: true,
    }),
    prisma.agentTask.findMany({
      where: { status: 'completed' },
      select: { success: true, iterations: true },
    }),
  ])

  const statusCounts: Record<string, number> = {}
  for (const item of byStatus) {
    statusCounts[item.status] = item._count
  }

  const typeCounts: Record<string, number> = {}
  for (const item of byType) {
    typeCounts[item.type] = item._count
  }

  const successfulTasks = completed.filter((t) => t.success).length
  const successRate = completed.length > 0 ? (successfulTasks / completed.length) * 100 : 0

  const totalIterations = completed.reduce((sum, t) => sum + (t.iterations || 0), 0)
  const avgIterations = completed.length > 0 ? totalIterations / completed.length : 0

  return {
    total,
    byStatus: statusCounts,
    byType: typeCounts,
    successRate,
    avgIterations,
  }
}

/**
 * Delete old tasks (cleanup)
 */
export async function deleteOldTasks(olderThan: Date): Promise<number> {
  const result = await prisma.agentTask.deleteMany({
    where: {
      createdAt: { lt: olderThan },
      status: { in: ['completed', 'failed', 'cancelled'] },
    },
  })
  return result.count
}

/**
 * Mark running tasks as failed on startup (orphaned tasks)
 */
export async function cleanupOrphanedTasks(): Promise<number> {
  const result = await prisma.agentTask.updateMany({
    where: {
      status: 'running',
    },
    data: {
      status: 'failed',
      error: 'Task was interrupted due to application restart',
    },
  })
  return result.count
}

import type {
  Task,
  TaskStatus,
  TaskPriority,
  TaskQueueState,
  TaskFilter,
  CreateTaskInput,
  AgentRole,
  AutonomyLevel,
} from '../types/index.js'

type TaskEventType = 'added' | 'updated' | 'removed' | 'status_changed'

interface TaskEvent {
  type: TaskEventType
  task: Task
  previousStatus?: TaskStatus
}

type TaskEventHandler = (event: TaskEvent) => void

export class TaskQueue {
  private tasks: Map<string, Task> = new Map()
  private eventHandlers: TaskEventHandler[] = []

  constructor(private autonomyLevels: Record<AgentRole, AutonomyLevel>) {}

  generateId(): string {
    return `task-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  }

  create(input: CreateTaskInput): Task {
    const task: Task = {
      id: this.generateId(),
      type: input.type,
      status: 'pending',
      priority: input.priority || 'normal',
      autonomyLevel: this.autonomyLevels[input.type],
      title: input.title,
      description: input.description,
      target: input.target,
      options: input.options || {},
      createdAt: Date.now(),
      childTaskIds: [],
      retryCount: 0,
      maxRetries: 3,
      parentTaskId: input.parentTaskId,
    }

    this.tasks.set(task.id, task)
    this.emit({ type: 'added', task })

    return task
  }

  get(id: string): Task | undefined {
    return this.tasks.get(id)
  }

  getAll(): Task[] {
    return Array.from(this.tasks.values())
  }

  getByStatus(status: TaskStatus): Task[] {
    return this.getAll().filter((t) => t.status === status)
  }

  getByType(type: AgentRole): Task[] {
    return this.getAll().filter((t) => t.type === type)
  }

  filter(filter: TaskFilter): Task[] {
    return this.getAll().filter((task) => {
      if (filter.status && !filter.status.includes(task.status)) {
        return false
      }
      if (filter.type && !filter.type.includes(task.type)) {
        return false
      }
      if (filter.priority && !filter.priority.includes(task.priority)) {
        return false
      }
      if (filter.since && task.createdAt < filter.since) {
        return false
      }
      if (filter.until && task.createdAt > filter.until) {
        return false
      }
      return true
    })
  }

  updateStatus(id: string, status: TaskStatus): boolean {
    const task = this.tasks.get(id)
    if (!task) return false

    const previousStatus = task.status
    task.status = status

    if (status === 'running' && !task.startedAt) {
      task.startedAt = Date.now()
    }

    if (status === 'completed' || status === 'failed' || status === 'cancelled') {
      task.completedAt = Date.now()
    }

    this.emit({ type: 'status_changed', task, previousStatus })
    return true
  }

  update(id: string, updates: Partial<Task>): boolean {
    const task = this.tasks.get(id)
    if (!task) return false

    Object.assign(task, updates)
    this.emit({ type: 'updated', task })
    return true
  }

  remove(id: string): boolean {
    const task = this.tasks.get(id)
    if (!task) return false

    this.tasks.delete(id)
    this.emit({ type: 'removed', task })
    return true
  }

  getNext(): Task | undefined {
    // Get pending tasks sorted by priority and creation time
    const pending = this.getByStatus('pending').sort((a, b) => {
      const priorityOrder: Record<TaskPriority, number> = {
        critical: 0,
        high: 1,
        normal: 2,
        low: 3,
      }

      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
      if (priorityDiff !== 0) return priorityDiff

      return a.createdAt - b.createdAt
    })

    return pending[0]
  }

  getRunning(): Task | undefined {
    const running = this.getByStatus('running')
    return running[0]
  }

  getAwaitingApproval(): Task[] {
    return this.getByStatus('awaiting_approval')
  }

  getState(): TaskQueueState {
    return {
      pending: this.getByStatus('pending'),
      running: this.getRunning() || null,
      completed: this.getByStatus('completed'),
      failed: this.getByStatus('failed'),
    }
  }

  addChildTask(parentId: string, childId: string): boolean {
    const parent = this.tasks.get(parentId)
    if (!parent) return false

    parent.childTaskIds.push(childId)
    return true
  }

  canRetry(id: string): boolean {
    const task = this.tasks.get(id)
    if (!task) return false

    return task.retryCount < task.maxRetries
  }

  incrementRetry(id: string): boolean {
    const task = this.tasks.get(id)
    if (!task) return false

    task.retryCount++
    return true
  }

  clear(): void {
    this.tasks.clear()
  }

  onEvent(handler: TaskEventHandler): void {
    this.eventHandlers.push(handler)
  }

  private emit(event: TaskEvent): void {
    for (const handler of this.eventHandlers) {
      handler(event)
    }
  }

  toJSON(): object {
    return {
      tasks: Array.from(this.tasks.values()),
      state: this.getState(),
    }
  }

  static fromJSON(data: { tasks: Task[] }, autonomyLevels: Record<AgentRole, AutonomyLevel>): TaskQueue {
    const queue = new TaskQueue(autonomyLevels)
    for (const task of data.tasks) {
      queue.tasks.set(task.id, task)
    }
    return queue
  }
}

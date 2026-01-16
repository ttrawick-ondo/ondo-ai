import type { Task, TaskPriority, AgentRole } from '../types/index.js'

export interface ScheduleOptions {
  maxConcurrent: number
  priorityWeights: Record<TaskPriority, number>
  typeWeights: Record<AgentRole, number>
  cooldownMs: number
}

export interface ScheduledTask {
  task: Task
  scheduledAt: number
  estimatedStart: number
  priority: number
}

const DEFAULT_OPTIONS: ScheduleOptions = {
  maxConcurrent: 1,
  priorityWeights: {
    critical: 1000,
    high: 100,
    normal: 10,
    low: 1,
  },
  typeWeights: {
    qa: 100,
    test: 80,
    feature: 50,
    refactor: 30,
  },
  cooldownMs: 1000,
}

export class Scheduler {
  private options: ScheduleOptions
  private scheduledTasks: ScheduledTask[] = []
  private runningTasks: Set<string> = new Set()
  private lastRunTime: Map<AgentRole, number> = new Map()

  constructor(options: Partial<ScheduleOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options }
  }

  schedule(task: Task): ScheduledTask {
    const priority = this.calculatePriority(task)
    const estimatedStart = this.estimateStartTime(task)

    const scheduled: ScheduledTask = {
      task,
      scheduledAt: Date.now(),
      estimatedStart,
      priority,
    }

    // Insert in priority order
    const insertIndex = this.scheduledTasks.findIndex(
      (t) => t.priority < priority
    )

    if (insertIndex === -1) {
      this.scheduledTasks.push(scheduled)
    } else {
      this.scheduledTasks.splice(insertIndex, 0, scheduled)
    }

    return scheduled
  }

  unschedule(taskId: string): boolean {
    const index = this.scheduledTasks.findIndex((s) => s.task.id === taskId)
    if (index === -1) return false

    this.scheduledTasks.splice(index, 1)
    return true
  }

  getNext(): ScheduledTask | undefined {
    if (this.runningTasks.size >= this.options.maxConcurrent) {
      return undefined
    }

    // Find first task that's not in cooldown
    for (const scheduled of this.scheduledTasks) {
      if (this.isInCooldown(scheduled.task.type)) {
        continue
      }
      return scheduled
    }

    return undefined
  }

  markRunning(taskId: string): void {
    this.runningTasks.add(taskId)

    // Remove from scheduled
    const index = this.scheduledTasks.findIndex((s) => s.task.id === taskId)
    if (index !== -1) {
      this.scheduledTasks.splice(index, 1)
    }
  }

  markComplete(taskId: string, type: AgentRole): void {
    this.runningTasks.delete(taskId)
    this.lastRunTime.set(type, Date.now())
  }

  isInCooldown(type: AgentRole): boolean {
    const lastRun = this.lastRunTime.get(type)
    if (!lastRun) return false

    return Date.now() - lastRun < this.options.cooldownMs
  }

  canRunMore(): boolean {
    return this.runningTasks.size < this.options.maxConcurrent
  }

  getScheduled(): ScheduledTask[] {
    return [...this.scheduledTasks]
  }

  getRunningCount(): number {
    return this.runningTasks.size
  }

  clear(): void {
    this.scheduledTasks = []
    this.runningTasks.clear()
    this.lastRunTime.clear()
  }

  reprioritize(): void {
    // Recalculate priorities and resort
    for (const scheduled of this.scheduledTasks) {
      scheduled.priority = this.calculatePriority(scheduled.task)
    }

    this.scheduledTasks.sort((a, b) => b.priority - a.priority)
  }

  private calculatePriority(task: Task): number {
    const priorityWeight = this.options.priorityWeights[task.priority]
    const typeWeight = this.options.typeWeights[task.type]

    // Add time-based aging (tasks that wait longer get higher priority)
    const waitTime = Date.now() - task.createdAt
    const agingBonus = Math.floor(waitTime / 60000) // 1 point per minute

    return priorityWeight * typeWeight + agingBonus
  }

  private estimateStartTime(task: Task): number {
    if (this.runningTasks.size === 0 && !this.isInCooldown(task.type)) {
      return Date.now()
    }

    // Estimate based on current queue
    let estimate = Date.now()

    // Add cooldown if needed
    const lastRun = this.lastRunTime.get(task.type)
    if (lastRun) {
      const cooldownRemaining = this.options.cooldownMs - (Date.now() - lastRun)
      if (cooldownRemaining > 0) {
        estimate += cooldownRemaining
      }
    }

    // Add estimated time for higher priority tasks
    const higherPriorityCount = this.scheduledTasks.filter(
      (s) => this.calculatePriority(s.task) > this.calculatePriority(task)
    ).length

    // Rough estimate of 2 minutes per task
    estimate += higherPriorityCount * 120000

    return estimate
  }

  updateOptions(options: Partial<ScheduleOptions>): void {
    this.options = { ...this.options, ...options }
    this.reprioritize()
  }
}

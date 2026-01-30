import type { Task, AgentEvent, AgentResult } from '../types/index.js'

/**
 * Interface for task persistence adapters
 */
export interface TaskPersistenceAdapter {
  /**
   * Create a new task in the database
   */
  createTask(task: Task): Promise<void>

  /**
   * Update task status
   */
  updateStatus(taskId: string, status: Task['status']): Promise<void>

  /**
   * Record the result of a completed task
   */
  recordResult(taskId: string, result: AgentResult): Promise<void>

  /**
   * Record an agent event
   */
  recordEvent(taskId: string, event: AgentEvent): Promise<void>

  /**
   * Get task by ID
   */
  getTask(taskId: string): Promise<Task | null>

  /**
   * Get all events for a task
   */
  getTaskEvents(taskId: string): Promise<AgentEvent[]>

  /**
   * Get recent tasks
   */
  getRecentTasks(limit?: number): Promise<Task[]>
}

/**
 * In-memory persistence adapter (default, for backward compatibility)
 */
export class InMemoryPersistenceAdapter implements TaskPersistenceAdapter {
  private tasks: Map<string, Task> = new Map()
  private events: Map<string, AgentEvent[]> = new Map()

  async createTask(task: Task): Promise<void> {
    this.tasks.set(task.id, { ...task })
    this.events.set(task.id, [])
  }

  async updateStatus(taskId: string, status: Task['status']): Promise<void> {
    const task = this.tasks.get(taskId)
    if (task) {
      task.status = status
      this.tasks.set(taskId, task)
    }
  }

  async recordResult(taskId: string, result: AgentResult): Promise<void> {
    const task = this.tasks.get(taskId)
    if (task) {
      task.result = {
        success: result.success,
        summary: result.summary,
        output: result.summary,
        agentResult: result,
        metrics: {
          duration: Date.now() - (task.startedAt || Date.now()),
          iterationsUsed: result.iterations,
          toolCallCount: result.toolsUsed.length,
          filesModified: result.changes.length,
        },
      }
      task.completedAt = Date.now()
      this.tasks.set(taskId, task)
    }
  }

  async recordEvent(taskId: string, event: AgentEvent): Promise<void> {
    const events = this.events.get(taskId) || []
    events.push(event)
    this.events.set(taskId, events)
  }

  async getTask(taskId: string): Promise<Task | null> {
    return this.tasks.get(taskId) || null
  }

  async getTaskEvents(taskId: string): Promise<AgentEvent[]> {
    return this.events.get(taskId) || []
  }

  async getRecentTasks(limit = 10): Promise<Task[]> {
    const tasks = Array.from(this.tasks.values())
    return tasks
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit)
  }
}

/**
 * HTTP-based persistence adapter for external database
 */
export class HttpPersistenceAdapter implements TaskPersistenceAdapter {
  private baseUrl: string
  private apiKey?: string

  constructor(baseUrl: string, apiKey?: string) {
    this.baseUrl = baseUrl
    this.apiKey = apiKey
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: { ...headers, ...options.headers },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json() as Promise<T>
  }

  async createTask(task: Task): Promise<void> {
    await this.request('/api/agent/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    })
  }

  async updateStatus(taskId: string, status: Task['status']): Promise<void> {
    await this.request(`/api/agent/tasks/${taskId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
  }

  async recordResult(taskId: string, result: AgentResult): Promise<void> {
    await this.request(`/api/agent/tasks/${taskId}/result`, {
      method: 'POST',
      body: JSON.stringify(result),
    })
  }

  async recordEvent(taskId: string, event: AgentEvent): Promise<void> {
    await this.request(`/api/agent/tasks/${taskId}/events`, {
      method: 'POST',
      body: JSON.stringify(event),
    })
  }

  async getTask(taskId: string): Promise<Task | null> {
    try {
      return await this.request(`/api/agent/tasks/${taskId}`)
    } catch {
      return null
    }
  }

  async getTaskEvents(taskId: string): Promise<AgentEvent[]> {
    return this.request(`/api/agent/tasks/${taskId}/events`)
  }

  async getRecentTasks(limit = 10): Promise<Task[]> {
    return this.request(`/api/agent/tasks?limit=${limit}`)
  }
}

/**
 * Create a persistence adapter based on environment
 */
export function createPersistenceAdapter(options?: {
  type?: 'memory' | 'http'
  baseUrl?: string
  apiKey?: string
}): TaskPersistenceAdapter {
  const type = options?.type || 'memory'

  if (type === 'http' && options?.baseUrl) {
    return new HttpPersistenceAdapter(options.baseUrl, options.apiKey)
  }

  return new InMemoryPersistenceAdapter()
}

// Default export
export default createPersistenceAdapter

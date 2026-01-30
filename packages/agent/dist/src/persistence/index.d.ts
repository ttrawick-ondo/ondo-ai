import type { Task, AgentEvent, AgentResult } from '../types/index.js';
/**
 * Interface for task persistence adapters
 */
export interface TaskPersistenceAdapter {
    /**
     * Create a new task in the database
     */
    createTask(task: Task): Promise<void>;
    /**
     * Update task status
     */
    updateStatus(taskId: string, status: Task['status']): Promise<void>;
    /**
     * Record the result of a completed task
     */
    recordResult(taskId: string, result: AgentResult): Promise<void>;
    /**
     * Record an agent event
     */
    recordEvent(taskId: string, event: AgentEvent): Promise<void>;
    /**
     * Get task by ID
     */
    getTask(taskId: string): Promise<Task | null>;
    /**
     * Get all events for a task
     */
    getTaskEvents(taskId: string): Promise<AgentEvent[]>;
    /**
     * Get recent tasks
     */
    getRecentTasks(limit?: number): Promise<Task[]>;
}
/**
 * In-memory persistence adapter (default, for backward compatibility)
 */
export declare class InMemoryPersistenceAdapter implements TaskPersistenceAdapter {
    private tasks;
    private events;
    createTask(task: Task): Promise<void>;
    updateStatus(taskId: string, status: Task['status']): Promise<void>;
    recordResult(taskId: string, result: AgentResult): Promise<void>;
    recordEvent(taskId: string, event: AgentEvent): Promise<void>;
    getTask(taskId: string): Promise<Task | null>;
    getTaskEvents(taskId: string): Promise<AgentEvent[]>;
    getRecentTasks(limit?: number): Promise<Task[]>;
}
/**
 * HTTP-based persistence adapter for external database
 */
export declare class HttpPersistenceAdapter implements TaskPersistenceAdapter {
    private baseUrl;
    private apiKey?;
    constructor(baseUrl: string, apiKey?: string);
    private request;
    createTask(task: Task): Promise<void>;
    updateStatus(taskId: string, status: Task['status']): Promise<void>;
    recordResult(taskId: string, result: AgentResult): Promise<void>;
    recordEvent(taskId: string, event: AgentEvent): Promise<void>;
    getTask(taskId: string): Promise<Task | null>;
    getTaskEvents(taskId: string): Promise<AgentEvent[]>;
    getRecentTasks(limit?: number): Promise<Task[]>;
}
/**
 * Create a persistence adapter based on environment
 */
export declare function createPersistenceAdapter(options?: {
    type?: 'memory' | 'http';
    baseUrl?: string;
    apiKey?: string;
}): TaskPersistenceAdapter;
export default createPersistenceAdapter;
//# sourceMappingURL=index.d.ts.map
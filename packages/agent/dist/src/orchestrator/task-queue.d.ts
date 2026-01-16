import type { Task, TaskStatus, TaskQueueState, TaskFilter, CreateTaskInput, AgentRole, AutonomyLevel } from '../types/index.js';
type TaskEventType = 'added' | 'updated' | 'removed' | 'status_changed';
interface TaskEvent {
    type: TaskEventType;
    task: Task;
    previousStatus?: TaskStatus;
}
type TaskEventHandler = (event: TaskEvent) => void;
export declare class TaskQueue {
    private autonomyLevels;
    private tasks;
    private eventHandlers;
    constructor(autonomyLevels: Record<AgentRole, AutonomyLevel>);
    generateId(): string;
    create(input: CreateTaskInput): Task;
    get(id: string): Task | undefined;
    getAll(): Task[];
    getByStatus(status: TaskStatus): Task[];
    getByType(type: AgentRole): Task[];
    filter(filter: TaskFilter): Task[];
    updateStatus(id: string, status: TaskStatus): boolean;
    update(id: string, updates: Partial<Task>): boolean;
    remove(id: string): boolean;
    getNext(): Task | undefined;
    getRunning(): Task | undefined;
    getAwaitingApproval(): Task[];
    getState(): TaskQueueState;
    addChildTask(parentId: string, childId: string): boolean;
    canRetry(id: string): boolean;
    incrementRetry(id: string): boolean;
    clear(): void;
    onEvent(handler: TaskEventHandler): void;
    private emit;
    toJSON(): object;
    static fromJSON(data: {
        tasks: Task[];
    }, autonomyLevels: Record<AgentRole, AutonomyLevel>): TaskQueue;
}
export {};
//# sourceMappingURL=task-queue.d.ts.map
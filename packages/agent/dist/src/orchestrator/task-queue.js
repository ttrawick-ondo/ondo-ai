export class TaskQueue {
    autonomyLevels;
    tasks = new Map();
    eventHandlers = [];
    constructor(autonomyLevels) {
        this.autonomyLevels = autonomyLevels;
    }
    generateId() {
        return `task-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }
    create(input) {
        const task = {
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
        };
        this.tasks.set(task.id, task);
        this.emit({ type: 'added', task });
        return task;
    }
    get(id) {
        return this.tasks.get(id);
    }
    getAll() {
        return Array.from(this.tasks.values());
    }
    getByStatus(status) {
        return this.getAll().filter((t) => t.status === status);
    }
    getByType(type) {
        return this.getAll().filter((t) => t.type === type);
    }
    filter(filter) {
        return this.getAll().filter((task) => {
            if (filter.status && !filter.status.includes(task.status)) {
                return false;
            }
            if (filter.type && !filter.type.includes(task.type)) {
                return false;
            }
            if (filter.priority && !filter.priority.includes(task.priority)) {
                return false;
            }
            if (filter.since && task.createdAt < filter.since) {
                return false;
            }
            if (filter.until && task.createdAt > filter.until) {
                return false;
            }
            return true;
        });
    }
    updateStatus(id, status) {
        const task = this.tasks.get(id);
        if (!task)
            return false;
        const previousStatus = task.status;
        task.status = status;
        if (status === 'running' && !task.startedAt) {
            task.startedAt = Date.now();
        }
        if (status === 'completed' || status === 'failed' || status === 'cancelled') {
            task.completedAt = Date.now();
        }
        this.emit({ type: 'status_changed', task, previousStatus });
        return true;
    }
    update(id, updates) {
        const task = this.tasks.get(id);
        if (!task)
            return false;
        Object.assign(task, updates);
        this.emit({ type: 'updated', task });
        return true;
    }
    remove(id) {
        const task = this.tasks.get(id);
        if (!task)
            return false;
        this.tasks.delete(id);
        this.emit({ type: 'removed', task });
        return true;
    }
    getNext() {
        // Get pending tasks sorted by priority and creation time
        const pending = this.getByStatus('pending').sort((a, b) => {
            const priorityOrder = {
                critical: 0,
                high: 1,
                normal: 2,
                low: 3,
            };
            const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
            if (priorityDiff !== 0)
                return priorityDiff;
            return a.createdAt - b.createdAt;
        });
        return pending[0];
    }
    getRunning() {
        const running = this.getByStatus('running');
        return running[0];
    }
    getAwaitingApproval() {
        return this.getByStatus('awaiting_approval');
    }
    getState() {
        return {
            pending: this.getByStatus('pending'),
            running: this.getRunning() || null,
            completed: this.getByStatus('completed'),
            failed: this.getByStatus('failed'),
        };
    }
    addChildTask(parentId, childId) {
        const parent = this.tasks.get(parentId);
        if (!parent)
            return false;
        parent.childTaskIds.push(childId);
        return true;
    }
    canRetry(id) {
        const task = this.tasks.get(id);
        if (!task)
            return false;
        return task.retryCount < task.maxRetries;
    }
    incrementRetry(id) {
        const task = this.tasks.get(id);
        if (!task)
            return false;
        task.retryCount++;
        return true;
    }
    clear() {
        this.tasks.clear();
    }
    onEvent(handler) {
        this.eventHandlers.push(handler);
    }
    emit(event) {
        for (const handler of this.eventHandlers) {
            handler(event);
        }
    }
    toJSON() {
        return {
            tasks: Array.from(this.tasks.values()),
            state: this.getState(),
        };
    }
    static fromJSON(data, autonomyLevels) {
        const queue = new TaskQueue(autonomyLevels);
        for (const task of data.tasks) {
            queue.tasks.set(task.id, task);
        }
        return queue;
    }
}
//# sourceMappingURL=task-queue.js.map
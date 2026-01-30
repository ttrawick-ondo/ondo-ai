/**
 * In-memory persistence adapter (default, for backward compatibility)
 */
export class InMemoryPersistenceAdapter {
    tasks = new Map();
    events = new Map();
    async createTask(task) {
        this.tasks.set(task.id, { ...task });
        this.events.set(task.id, []);
    }
    async updateStatus(taskId, status) {
        const task = this.tasks.get(taskId);
        if (task) {
            task.status = status;
            this.tasks.set(taskId, task);
        }
    }
    async recordResult(taskId, result) {
        const task = this.tasks.get(taskId);
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
            };
            task.completedAt = Date.now();
            this.tasks.set(taskId, task);
        }
    }
    async recordEvent(taskId, event) {
        const events = this.events.get(taskId) || [];
        events.push(event);
        this.events.set(taskId, events);
    }
    async getTask(taskId) {
        return this.tasks.get(taskId) || null;
    }
    async getTaskEvents(taskId) {
        return this.events.get(taskId) || [];
    }
    async getRecentTasks(limit = 10) {
        const tasks = Array.from(this.tasks.values());
        return tasks
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, limit);
    }
}
/**
 * HTTP-based persistence adapter for external database
 */
export class HttpPersistenceAdapter {
    baseUrl;
    apiKey;
    constructor(baseUrl, apiKey) {
        this.baseUrl = baseUrl;
        this.apiKey = apiKey;
    }
    async request(path, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
        };
        if (this.apiKey) {
            headers['Authorization'] = `Bearer ${this.apiKey}`;
        }
        const response = await fetch(`${this.baseUrl}${path}`, {
            ...options,
            headers: { ...headers, ...options.headers },
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
    }
    async createTask(task) {
        await this.request('/api/agent/tasks', {
            method: 'POST',
            body: JSON.stringify(task),
        });
    }
    async updateStatus(taskId, status) {
        await this.request(`/api/agent/tasks/${taskId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
        });
    }
    async recordResult(taskId, result) {
        await this.request(`/api/agent/tasks/${taskId}/result`, {
            method: 'POST',
            body: JSON.stringify(result),
        });
    }
    async recordEvent(taskId, event) {
        await this.request(`/api/agent/tasks/${taskId}/events`, {
            method: 'POST',
            body: JSON.stringify(event),
        });
    }
    async getTask(taskId) {
        try {
            return await this.request(`/api/agent/tasks/${taskId}`);
        }
        catch {
            return null;
        }
    }
    async getTaskEvents(taskId) {
        return this.request(`/api/agent/tasks/${taskId}/events`);
    }
    async getRecentTasks(limit = 10) {
        return this.request(`/api/agent/tasks?limit=${limit}`);
    }
}
/**
 * Create a persistence adapter based on environment
 */
export function createPersistenceAdapter(options) {
    const type = options?.type || 'memory';
    if (type === 'http' && options?.baseUrl) {
        return new HttpPersistenceAdapter(options.baseUrl, options.apiKey);
    }
    return new InMemoryPersistenceAdapter();
}
// Default export
export default createPersistenceAdapter;
//# sourceMappingURL=index.js.map
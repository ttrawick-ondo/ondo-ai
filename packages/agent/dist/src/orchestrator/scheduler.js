const DEFAULT_OPTIONS = {
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
};
export class Scheduler {
    options;
    scheduledTasks = [];
    runningTasks = new Set();
    lastRunTime = new Map();
    constructor(options = {}) {
        this.options = { ...DEFAULT_OPTIONS, ...options };
    }
    schedule(task) {
        const priority = this.calculatePriority(task);
        const estimatedStart = this.estimateStartTime(task);
        const scheduled = {
            task,
            scheduledAt: Date.now(),
            estimatedStart,
            priority,
        };
        // Insert in priority order
        const insertIndex = this.scheduledTasks.findIndex((t) => t.priority < priority);
        if (insertIndex === -1) {
            this.scheduledTasks.push(scheduled);
        }
        else {
            this.scheduledTasks.splice(insertIndex, 0, scheduled);
        }
        return scheduled;
    }
    unschedule(taskId) {
        const index = this.scheduledTasks.findIndex((s) => s.task.id === taskId);
        if (index === -1)
            return false;
        this.scheduledTasks.splice(index, 1);
        return true;
    }
    getNext() {
        if (this.runningTasks.size >= this.options.maxConcurrent) {
            return undefined;
        }
        // Find first task that's not in cooldown
        for (const scheduled of this.scheduledTasks) {
            if (this.isInCooldown(scheduled.task.type)) {
                continue;
            }
            return scheduled;
        }
        return undefined;
    }
    markRunning(taskId) {
        this.runningTasks.add(taskId);
        // Remove from scheduled
        const index = this.scheduledTasks.findIndex((s) => s.task.id === taskId);
        if (index !== -1) {
            this.scheduledTasks.splice(index, 1);
        }
    }
    markComplete(taskId, type) {
        this.runningTasks.delete(taskId);
        this.lastRunTime.set(type, Date.now());
    }
    isInCooldown(type) {
        const lastRun = this.lastRunTime.get(type);
        if (!lastRun)
            return false;
        return Date.now() - lastRun < this.options.cooldownMs;
    }
    canRunMore() {
        return this.runningTasks.size < this.options.maxConcurrent;
    }
    getScheduled() {
        return [...this.scheduledTasks];
    }
    getRunningCount() {
        return this.runningTasks.size;
    }
    clear() {
        this.scheduledTasks = [];
        this.runningTasks.clear();
        this.lastRunTime.clear();
    }
    reprioritize() {
        // Recalculate priorities and resort
        for (const scheduled of this.scheduledTasks) {
            scheduled.priority = this.calculatePriority(scheduled.task);
        }
        this.scheduledTasks.sort((a, b) => b.priority - a.priority);
    }
    calculatePriority(task) {
        const priorityWeight = this.options.priorityWeights[task.priority];
        const typeWeight = this.options.typeWeights[task.type];
        // Add time-based aging (tasks that wait longer get higher priority)
        const waitTime = Date.now() - task.createdAt;
        const agingBonus = Math.floor(waitTime / 60000); // 1 point per minute
        return priorityWeight * typeWeight + agingBonus;
    }
    estimateStartTime(task) {
        if (this.runningTasks.size === 0 && !this.isInCooldown(task.type)) {
            return Date.now();
        }
        // Estimate based on current queue
        let estimate = Date.now();
        // Add cooldown if needed
        const lastRun = this.lastRunTime.get(task.type);
        if (lastRun) {
            const cooldownRemaining = this.options.cooldownMs - (Date.now() - lastRun);
            if (cooldownRemaining > 0) {
                estimate += cooldownRemaining;
            }
        }
        // Add estimated time for higher priority tasks
        const higherPriorityCount = this.scheduledTasks.filter((s) => this.calculatePriority(s.task) > this.calculatePriority(task)).length;
        // Rough estimate of 2 minutes per task
        estimate += higherPriorityCount * 120000;
        return estimate;
    }
    updateOptions(options) {
        this.options = { ...this.options, ...options };
        this.reprioritize();
    }
}
//# sourceMappingURL=scheduler.js.map
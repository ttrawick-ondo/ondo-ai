export class ApprovalGate {
    pendingApprovals = new Map();
    approvalHandler = null;
    autoApprovalCount = 0;
    maxAutoApprovals;
    constructor(maxAutoApprovals = 10) {
        this.maxAutoApprovals = maxAutoApprovals;
    }
    setApprovalHandler(handler) {
        this.approvalHandler = handler;
    }
    async requestApproval(task, plan) {
        // Check if task requires approval based on autonomy level
        if (!this.requiresApproval(task, plan)) {
            this.autoApprovalCount++;
            return {
                requestId: this.generateId(),
                approved: true,
                reason: 'Auto-approved based on autonomy level',
                timestamp: Date.now(),
            };
        }
        // Create approval request
        const request = {
            id: this.generateId(),
            task,
            plan,
            summary: this.generateSummary(task, plan),
            risks: plan.risks,
            timestamp: Date.now(),
        };
        this.pendingApprovals.set(request.id, request);
        // If no handler is set, auto-reject
        if (!this.approvalHandler) {
            const decision = {
                requestId: request.id,
                approved: false,
                reason: 'No approval handler configured',
                timestamp: Date.now(),
            };
            this.pendingApprovals.delete(request.id);
            return decision;
        }
        // Request approval from handler
        const decision = await this.approvalHandler(request);
        this.pendingApprovals.delete(request.id);
        return decision;
    }
    requiresApproval(task, plan) {
        // Check if plan explicitly requires approval
        if (plan.requiresApproval) {
            return true;
        }
        // Check autonomy level
        switch (task.autonomyLevel) {
            case 'full':
                return false;
            case 'supervised':
                return true;
            case 'manual':
                return true;
            default:
                return true;
        }
    }
    shouldAutoApprove(task) {
        if (task.autonomyLevel !== 'full') {
            return false;
        }
        // Check if we've exceeded max auto approvals
        if (this.autoApprovalCount >= this.maxAutoApprovals) {
            return false;
        }
        return true;
    }
    getAutonomyLevel(role, autonomyConfig) {
        return autonomyConfig[role] || 'supervised';
    }
    getPendingApprovals() {
        return Array.from(this.pendingApprovals.values());
    }
    getPendingApproval(id) {
        return this.pendingApprovals.get(id);
    }
    cancelApproval(id) {
        return this.pendingApprovals.delete(id);
    }
    resetAutoApprovalCount() {
        this.autoApprovalCount = 0;
    }
    getAutoApprovalCount() {
        return this.autoApprovalCount;
    }
    generateId() {
        return `approval-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }
    generateSummary(task, plan) {
        const lines = [
            `Task: ${task.title}`,
            `Type: ${task.type}`,
            `Description: ${task.description}`,
            '',
            'Execution Plan:',
            ...plan.steps.map((s, i) => `  ${i + 1}. ${s.description}`),
            '',
            `Estimated tool calls: ${plan.estimatedToolCalls}`,
        ];
        if (plan.risks.length > 0) {
            lines.push('', 'Risks:');
            lines.push(...plan.risks.map((r) => `  - ${r}`));
        }
        return lines.join('\n');
    }
}
// Interactive approval handler for CLI
export function createInteractiveApprovalHandler(promptFn) {
    return async (request) => {
        console.log('\n' + '='.repeat(60));
        console.log('APPROVAL REQUIRED');
        console.log('='.repeat(60));
        console.log(request.summary);
        console.log('='.repeat(60) + '\n');
        const response = await promptFn('Do you want to proceed?', ['yes', 'no', 'modify']);
        if (response === 'yes') {
            return {
                requestId: request.id,
                approved: true,
                timestamp: Date.now(),
            };
        }
        if (response === 'modify') {
            // In a real implementation, this would allow modifying the plan
            return {
                requestId: request.id,
                approved: true,
                reason: 'Plan modified by user',
                modifiedPlan: request.plan,
                timestamp: Date.now(),
            };
        }
        return {
            requestId: request.id,
            approved: false,
            reason: 'Rejected by user',
            timestamp: Date.now(),
        };
    };
}
// Auto-approve handler for testing
export function createAutoApproveHandler() {
    return async (request) => {
        return {
            requestId: request.id,
            approved: true,
            reason: 'Auto-approved for testing',
            timestamp: Date.now(),
        };
    };
}
// Auto-reject handler
export function createAutoRejectHandler(reason = 'Auto-rejected') {
    return async (request) => {
        return {
            requestId: request.id,
            approved: false,
            reason,
            timestamp: Date.now(),
        };
    };
}
//# sourceMappingURL=approval-gate.js.map
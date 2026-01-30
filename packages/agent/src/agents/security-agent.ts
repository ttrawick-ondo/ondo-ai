import type {
  AgentContext,
  AgentResult,
  AgentMetadata,
  ExecutionPlan,
  ValidationResult,
} from '../types/index.js'
import { AbstractAgent } from './base.js'

export class SecurityAgent extends AbstractAgent {
  readonly metadata: AgentMetadata = {
    role: 'security',
    name: 'Security Agent',
    description: 'Performs security auditing including dependency scanning, SAST, and secret detection',
    autonomyLevel: 'supervised',
    capabilities: {
      canReadFiles: true,
      canWriteFiles: true,
      canExecuteCommands: true,
      canModifyTests: false,
      canModifySource: true,
      canCommit: false,
    },
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    return this.runAgentLoop(context)
  }

  async planExecution(context: AgentContext): Promise<ExecutionPlan> {
    const scanType = context.task.options.scanType || 'full'
    const steps = []

    // Step 1: Analyze project structure
    steps.push({
      id: 'analyze-structure',
      description: 'Analyze project structure and identify files to scan',
      toolName: 'listFiles',
      dependsOn: [],
      optional: false,
    })

    // Step 2: Dependency scanning
    if (scanType === 'full' || scanType === 'dependencies') {
      steps.push({
        id: 'read-package-json',
        description: 'Read package.json to analyze dependencies',
        toolName: 'readFile',
        dependsOn: ['analyze-structure'],
        optional: false,
      })

      steps.push({
        id: 'check-vulnerabilities',
        description: 'Check dependencies for known vulnerabilities',
        toolName: 'runCommand',
        dependsOn: ['read-package-json'],
        optional: false,
      })
    }

    // Step 3: Secret detection
    if (scanType === 'full' || scanType === 'secrets') {
      steps.push({
        id: 'scan-secrets',
        description: 'Scan codebase for hardcoded secrets and credentials',
        toolName: 'searchContent',
        dependsOn: ['analyze-structure'],
        optional: false,
      })

      steps.push({
        id: 'check-env-files',
        description: 'Check for exposed environment files',
        toolName: 'searchFiles',
        dependsOn: ['analyze-structure'],
        optional: false,
      })
    }

    // Step 4: Static Analysis (SAST)
    if (scanType === 'full' || scanType === 'sast') {
      steps.push({
        id: 'analyze-code-patterns',
        description: 'Analyze code for security anti-patterns',
        toolName: 'analyzeFile',
        dependsOn: ['analyze-structure'],
        optional: false,
      })

      steps.push({
        id: 'check-input-validation',
        description: 'Check for missing input validation',
        toolName: 'searchContent',
        dependsOn: ['analyze-structure'],
        optional: false,
      })
    }

    // Step 5: Generate report
    steps.push({
      id: 'generate-report',
      description: 'Generate security audit report',
      toolName: 'writeFile',
      dependsOn: steps.map(s => s.id).filter(id => id !== 'generate-report'),
      optional: false,
    })

    return {
      steps,
      estimatedToolCalls: steps.length * 3,
      requiresApproval: true,
      risks: [
        'May expose security vulnerabilities in logs',
        'Running npm audit may require network access',
      ],
    }
  }

  async validateResult(result: AgentResult): Promise<ValidationResult> {
    const issues = []

    if (!result.success) {
      issues.push({
        severity: 'error' as const,
        message: result.error || 'Security audit failed',
      })
    }

    // Check if a report was generated
    const reportFiles = result.changes.filter(
      (c) =>
        c.path.includes('security') ||
        c.path.includes('audit') ||
        c.path.includes('SECURITY')
    )

    if (reportFiles.length === 0 && result.success) {
      issues.push({
        severity: 'warning' as const,
        message: 'No security report was generated',
      })
    }

    return {
      valid: issues.filter((i) => i.severity === 'error').length === 0,
      issues,
      suggestions: reportFiles.length === 0
        ? ['Review agent output for security findings']
        : [],
    }
  }

  protected buildSystemPrompt(context: AgentContext): string {
    const scanType = context.task.options.scanType || 'full'

    return `You are a Security Agent specialized in identifying security vulnerabilities and risks in software projects.

Your responsibilities:
1. Scan dependencies for known vulnerabilities (CVEs)
2. Detect hardcoded secrets, API keys, and credentials
3. Identify security anti-patterns in code (SAST)
4. Check for common security misconfigurations
5. Generate actionable security reports

Security Scan Types:
- full: Complete security audit (dependencies, secrets, SAST)
- dependencies: Scan package.json and lock files for vulnerable packages
- secrets: Detect hardcoded secrets, API keys, passwords, tokens
- sast: Static Application Security Testing for code vulnerabilities

What to Look For:

1. **Secrets & Credentials:**
   - API keys, tokens, passwords in source code
   - Hardcoded connection strings
   - Private keys or certificates
   - .env files committed to repository
   - Secrets in config files or comments

2. **Dependency Vulnerabilities:**
   - Known CVEs in direct dependencies
   - Outdated packages with security patches
   - Deprecated packages
   - Packages with security advisories

3. **Code Security Issues (SAST):**
   - SQL injection vulnerabilities
   - XSS (Cross-Site Scripting) risks
   - Command injection
   - Path traversal
   - Insecure deserialization
   - Missing input validation
   - Improper error handling exposing info
   - Insecure random number generation
   - Hardcoded cryptographic keys

4. **Configuration Issues:**
   - Overly permissive CORS settings
   - Debug mode enabled in production
   - Missing security headers
   - Insecure cookie settings
   - Exposed admin interfaces

Current scan type: ${scanType}

Secret Detection Patterns:
- AWS keys: AKIA[0-9A-Z]{16}
- GitHub tokens: ghp_[a-zA-Z0-9]{36}
- Generic API keys: ['"](api[_-]?key|apikey|api[_-]?secret)['"]\s*[:=]\s*['"][^'"]+['"]
- Private keys: -----BEGIN (RSA|EC|DSA|OPENSSH) PRIVATE KEY-----
- Passwords in code: password\s*=\s*['"][^'"]+['"]
- Connection strings: (mongodb|postgres|mysql|redis):\/\/[^\\s]+

Available tools:
${Array.from(context.tools.keys()).join(', ')}

Working directory: ${context.workingDirectory}
Max iterations: ${context.maxIterations}

When you complete the audit, provide:
- Summary of findings by severity (Critical, High, Medium, Low, Info)
- Detailed list of each vulnerability found
- Remediation recommendations
- Files that need attention`
  }

  protected buildInitialPrompt(context: AgentContext): string {
    const scanType = context.task.options.scanType || 'full'
    const scope = context.task.target?.files?.join(', ') ||
                  context.task.target?.pattern ||
                  context.workingDirectory

    let instructions = ''

    switch (scanType) {
      case 'dependencies':
        instructions = `Perform a dependency security audit:
1. Read package.json and package-lock.json (or yarn.lock)
2. Run 'npm audit' or equivalent to check for vulnerabilities
3. Identify outdated packages with security patches
4. List all findings with severity levels
5. Provide upgrade recommendations`
        break

      case 'secrets':
        instructions = `Perform secret detection scan:
1. Search for hardcoded API keys, tokens, and passwords
2. Check for .env files that might be committed
3. Look for private keys or certificates in the codebase
4. Check config files for sensitive data
5. Report all findings with file locations and line numbers`
        break

      case 'sast':
        instructions = `Perform static application security testing:
1. Analyze code for injection vulnerabilities (SQL, XSS, Command)
2. Check for missing input validation
3. Look for insecure data handling
4. Identify authentication/authorization issues
5. Check for insecure cryptographic practices`
        break

      case 'full':
      default:
        instructions = `Perform a comprehensive security audit:
1. Scan dependencies for known vulnerabilities
2. Detect hardcoded secrets and credentials
3. Perform static analysis for code vulnerabilities
4. Check security configurations
5. Generate a detailed security report with all findings`
        break
    }

    return `Task: Security Audit (${scanType})
Scope: ${scope}

${instructions}

Task description: ${context.task.description}

Options:
- Scan type: ${scanType}
- Output report: ${context.task.options.reportPath || 'SECURITY-AUDIT.md'}
- Severity threshold: ${context.task.options.severityThreshold || 'info'}

Please:
1. First, analyze the project structure
2. Perform the appropriate security scans based on scan type
3. Collect and categorize all findings
4. Generate a comprehensive security report
5. Provide actionable remediation steps

Begin by analyzing the project structure.`
  }
}

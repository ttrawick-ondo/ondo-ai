import { spawn } from 'node:child_process';
import * as path from 'node:path';
function runCommand(command, args, cwd, timeout = 120000) {
    return new Promise((resolve) => {
        const proc = spawn(command, args, {
            cwd,
            shell: true,
            env: { ...process.env, FORCE_COLOR: '0' },
        });
        let stdout = '';
        let stderr = '';
        proc.stdout?.on('data', (data) => {
            stdout += data.toString();
        });
        proc.stderr?.on('data', (data) => {
            stderr += data.toString();
        });
        const timer = setTimeout(() => {
            proc.kill('SIGTERM');
            resolve({
                stdout,
                stderr: stderr + '\nProcess timed out',
                exitCode: 124,
            });
        }, timeout);
        proc.on('close', (code) => {
            clearTimeout(timer);
            resolve({
                stdout,
                stderr,
                exitCode: code ?? 1,
            });
        });
        proc.on('error', (error) => {
            clearTimeout(timer);
            resolve({
                stdout,
                stderr: error.message,
                exitCode: 1,
            });
        });
    });
}
export function createTestRunnerTools(workingDirectory) {
    const runTests = {
        name: 'runTests',
        description: 'Run tests using vitest. Returns test results including passed, failed, and coverage.',
        category: 'test',
        inputSchema: {
            type: 'object',
            properties: {
                pattern: {
                    type: 'string',
                    description: 'Test file pattern or specific test file to run',
                },
                watch: {
                    type: 'boolean',
                    description: 'Run in watch mode',
                    default: false,
                },
                coverage: {
                    type: 'boolean',
                    description: 'Collect coverage information',
                    default: false,
                },
                updateSnapshots: {
                    type: 'boolean',
                    description: 'Update snapshots',
                    default: false,
                },
                bail: {
                    type: 'boolean',
                    description: 'Stop on first failure',
                    default: false,
                },
            },
            required: [],
        },
        async execute(input) {
            const { pattern, watch = false, coverage = false, updateSnapshots = false, bail = false, } = input;
            const args = ['vitest', 'run'];
            if (pattern)
                args.push(pattern);
            if (watch) {
                args.splice(1, 1); // Remove 'run' for watch mode
            }
            if (coverage)
                args.push('--coverage');
            if (updateSnapshots)
                args.push('--update');
            if (bail)
                args.push('--bail');
            args.push('--reporter=json');
            try {
                const result = await runCommand('npx', args, workingDirectory);
                // Try to parse JSON output
                let testResult = null;
                try {
                    const jsonMatch = result.stdout.match(/\{[\s\S]*"testResults"[\s\S]*\}/);
                    if (jsonMatch) {
                        const parsed = JSON.parse(jsonMatch[0]);
                        testResult = {
                            passed: parsed.numPassedTests || 0,
                            failed: parsed.numFailedTests || 0,
                            skipped: parsed.numPendingTests || 0,
                            total: parsed.numTotalTests || 0,
                            duration: parsed.duration || 0,
                            failures: (parsed.testResults || [])
                                .flatMap((tr) => (tr.assertionResults || [])
                                .filter((ar) => ar.status === 'failed')
                                .map((ar) => ({
                                name: ar.fullName,
                                file: tr.name,
                                error: ar.failureMessages?.join('\n') || 'Unknown error',
                            }))),
                        };
                    }
                }
                catch {
                    // JSON parsing failed, use raw output
                }
                const success = result.exitCode === 0;
                if (testResult) {
                    const summary = `Tests: ${testResult.passed} passed, ${testResult.failed} failed, ${testResult.total} total`;
                    return {
                        success,
                        output: `${summary}\n\n${result.stdout}`,
                        metadata: testResult,
                    };
                }
                return {
                    success,
                    output: result.stdout || result.stderr,
                    error: success ? undefined : 'Tests failed',
                };
            }
            catch (error) {
                return {
                    success: false,
                    output: '',
                    error: error instanceof Error ? error.message : 'Failed to run tests',
                };
            }
        },
    };
    const runSingleTest = {
        name: 'runSingleTest',
        description: 'Run a specific test file or test by name',
        category: 'test',
        inputSchema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    description: 'Path to the test file',
                },
                testName: {
                    type: 'string',
                    description: 'Name of the specific test to run (regex pattern)',
                },
            },
            required: ['file'],
        },
        async execute(input) {
            const { file, testName } = input;
            const args = ['vitest', 'run', file];
            if (testName) {
                args.push('-t', testName);
            }
            try {
                const result = await runCommand('npx', args, workingDirectory);
                return {
                    success: result.exitCode === 0,
                    output: result.stdout || result.stderr,
                    error: result.exitCode !== 0 ? 'Test failed' : undefined,
                };
            }
            catch (error) {
                return {
                    success: false,
                    output: '',
                    error: error instanceof Error ? error.message : 'Failed to run test',
                };
            }
        },
    };
    const getCoverage = {
        name: 'getCoverage',
        description: 'Run tests with coverage and return coverage metrics',
        category: 'test',
        inputSchema: {
            type: 'object',
            properties: {
                pattern: {
                    type: 'string',
                    description: 'Test file pattern to run',
                },
            },
            required: [],
        },
        async execute(input) {
            const { pattern } = input;
            const args = ['vitest', 'run', '--coverage', '--reporter=json'];
            if (pattern)
                args.push(pattern);
            try {
                const result = await runCommand('npx', args, workingDirectory);
                // Try to parse coverage from output
                let coverage = null;
                try {
                    const coverageMatch = result.stdout.match(/All files[^|]*\|([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|/);
                    if (coverageMatch) {
                        coverage = {
                            statements: parseFloat(coverageMatch[1].trim()),
                            branches: parseFloat(coverageMatch[2].trim()),
                            functions: parseFloat(coverageMatch[3].trim()),
                            lines: parseFloat(coverageMatch[4].trim()),
                        };
                    }
                }
                catch {
                    // Coverage parsing failed
                }
                return {
                    success: result.exitCode === 0,
                    output: result.stdout || result.stderr,
                    metadata: coverage ? { coverage } : undefined,
                };
            }
            catch (error) {
                return {
                    success: false,
                    output: '',
                    error: error instanceof Error ? error.message : 'Failed to get coverage',
                };
            }
        },
    };
    const listTests = {
        name: 'listTests',
        description: 'List all test files in the project',
        category: 'test',
        inputSchema: {
            type: 'object',
            properties: {
                pattern: {
                    type: 'string',
                    description: 'Glob pattern to filter test files',
                    default: '**/*.test.{ts,tsx}',
                },
            },
            required: [],
        },
        async execute(input) {
            const { pattern = '**/*.test.{ts,tsx}' } = input;
            const args = ['vitest', 'list', pattern];
            try {
                const result = await runCommand('npx', args, workingDirectory);
                return {
                    success: result.exitCode === 0,
                    output: result.stdout || 'No tests found',
                };
            }
            catch (error) {
                return {
                    success: false,
                    output: '',
                    error: error instanceof Error ? error.message : 'Failed to list tests',
                };
            }
        },
    };
    const checkTestFile = {
        name: 'checkTestFile',
        description: 'Check if a test file exists for a given source file',
        category: 'test',
        inputSchema: {
            type: 'object',
            properties: {
                sourceFile: {
                    type: 'string',
                    description: 'Path to the source file',
                },
            },
            required: ['sourceFile'],
        },
        async execute(input) {
            const { sourceFile } = input;
            // Generate potential test file paths
            const ext = path.extname(sourceFile);
            const baseName = path.basename(sourceFile, ext);
            const dirName = path.dirname(sourceFile);
            const potentialPaths = [
                path.join(dirName, `${baseName}.test${ext}`),
                path.join(dirName, `${baseName}.spec${ext}`),
                path.join(dirName, '__tests__', `${baseName}.test${ext}`),
                path.join(dirName, '__tests__', `${baseName}.spec${ext}`),
                path.join('tests', dirName, `${baseName}.test${ext}`),
            ];
            const fs = await import('node:fs/promises');
            for (const testPath of potentialPaths) {
                const fullPath = path.resolve(workingDirectory, testPath);
                try {
                    await fs.access(fullPath);
                    return {
                        success: true,
                        output: testPath,
                        metadata: { exists: true, testPath },
                    };
                }
                catch {
                    // File doesn't exist, try next
                }
            }
            return {
                success: true,
                output: 'No test file found',
                metadata: {
                    exists: false,
                    suggestedPath: potentialPaths[0],
                },
            };
        },
    };
    return [runTests, runSingleTest, getCoverage, listTests, checkTestFile];
}
//# sourceMappingURL=test-runner.js.map
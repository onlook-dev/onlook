import type { CodeFileSystem } from "@onlook/file-system";
import type { EditorEngine } from "@onlook/web-client/src/components/store/editor/engine";
import type { SandboxManager } from "@onlook/web-client/src/components/store/editor/sandbox";

export async function getFileSystem(branchId: string, editorEngine: EditorEngine): Promise<CodeFileSystem> {
    const fileSystem = editorEngine.branches.getBranchDataById(branchId)?.codeEditor;
    if (!fileSystem) {
        throw new Error(`Cannot get file system for branch ${branchId}: file system not found`);
    }
    await fileSystem.initialize();
    return fileSystem;
}

export async function resolveDirectoryPath(inputPath: string | undefined, sandbox: SandboxManager): Promise<string> {
    if (!inputPath) {
        // Get current working directory
        const pwdResult = await safeRunCommand(sandbox, 'pwd', '.');
        return pwdResult.success ? pwdResult.output.trim() : '.';
    }

    const resolved = await resolvePath(inputPath, sandbox);
    if (resolved.path) {
        // Verify it's a directory
        const hasTestCommand = await isCommandAvailable(sandbox, 'test');
        if (hasTestCommand) {
            const isDir = await safeRunCommand(sandbox, `test -d "${resolved.path}" && echo "dir" || echo "not_dir"`);
            if (isDir.success && isDir.output.trim() === 'dir') {
                return resolved.path;
            }
        } else {
            // Fallback: try to read directory to verify it exists and is a directory
            try {
                const dirContents = await sandbox.readDir(resolved.path);
                if (dirContents) {
                    return resolved.path;
                }
            } catch {
                // Not a directory or doesn't exist, continue to fallback
            }
        }
    }

    // Fallback to original path
    return inputPath.startsWith('/') ? inputPath : `./${inputPath}`;
}

// Safe command execution with fallback handling
export async function safeRunCommand(sandbox: SandboxManager, command: string, fallbackValue?: string): Promise<{ success: boolean; output: string; isReliable: boolean }> {
    try {
        const result = await sandbox.session.runCommand(command);
        // Some commands return success: false even when they work - check output too
        const hasOutput = !!result.output && result.output.trim().length > 0;
        const isActuallySuccessful = result.success ?? (hasOutput && !result.output.includes('command not found') && !result.output.includes('not found'));

        return {
            success: isActuallySuccessful,
            output: result.output || '',
            isReliable: result.success // Track if the success flag is reliable
        };
    } catch (error) {
        if (fallbackValue !== undefined) {
            return { success: true, output: fallbackValue, isReliable: false };
        }
        return { success: false, output: '', isReliable: false };
    }
}

// Check if a command is available
export async function isCommandAvailable(sandbox: SandboxManager, command: string): Promise<boolean> {
    const result = await safeRunCommand(sandbox, `which ${command} 2>/dev/null || command -v ${command} 2>/dev/null`);
    return result.success && result.output.trim().length > 0;
}

// Utility functions for path resolution and fuzzy matching
export async function resolvePath(inputPath: string, sandbox: SandboxManager): Promise<{ path: string | null; wasFuzzy: boolean }> {
    // Check if test command is available
    const hasTestCommand = await isCommandAvailable(sandbox, 'test');
    const hasRealpathCommand = await isCommandAvailable(sandbox, 'realpath');

    // If already absolute path, try it first
    if (inputPath.startsWith('/')) {
        if (hasTestCommand) {
            const result = await safeRunCommand(sandbox, `test -e "${inputPath}" && echo "exists" || echo "not_found"`);
            if (result.success && result.output.trim() === 'exists') {
                return { path: inputPath, wasFuzzy: false };
            }
        } else {
            // Fallback: try to read the file directly to check existence
            try {
                const file = await sandbox.readFile(inputPath);
                return { path: inputPath, wasFuzzy: false };
            } catch {
                // Continue to fuzzy matching
            }
        }
    } else {
        // Try relative to current directory first
        if (hasTestCommand && hasRealpathCommand) {
            const result = await safeRunCommand(sandbox, `test -e "${inputPath}" && realpath "${inputPath}" || echo "not_found"`);
            if (result.success && result.output.trim() !== 'not_found') {
                const resolvedPath = result.output.trim();
                // Only consider it fuzzy if the resolved path is significantly different from input
                const wasFuzzy = !resolvedPath.endsWith(inputPath) && !inputPath.includes('/');
                return { path: resolvedPath, wasFuzzy };
            }
        } else {
            // Fallback: try the relative path as-is first
            try {
                const file = await sandbox.readFile(inputPath);
                return { path: inputPath, wasFuzzy: false };
            } catch {
                // Continue to fuzzy matching
            }
        }
    }

    // Fuzzy path matching - try to find similar paths
    const fuzzyResult = await findFuzzyPath(inputPath, sandbox);
    return { path: fuzzyResult, wasFuzzy: fuzzyResult !== null };
}

export async function findFuzzyPath(inputPath: string, sandbox: SandboxManager): Promise<string | null> {
    // Extract filename/directory name from path
    const parts = inputPath.split('/').filter(p => p);
    const targetName = parts[parts.length - 1];

    if (!targetName) return null;

    // Check if find command is available
    const hasFindCommand = await isCommandAvailable(sandbox, 'find');
    const hasRealpathCommand = await isCommandAvailable(sandbox, 'realpath');

    if (hasFindCommand) {
        // Search for files/directories with similar names using find
        // Properly escape the targetName by replacing single quotes with '\''
        const escapedTargetName = targetName.replace(/'/g, "'\\''");
        const findCommand = `find . \\( -name '*${escapedTargetName}*' -type f -o -name '*${escapedTargetName}*' -type d \\) | head -10`;
        const result = await safeRunCommand(sandbox, findCommand);

        if (result.success && result.output.trim()) {
            const candidates = result.output.trim().split('\n').filter((line: string) => line.trim());

            // Simple scoring - prefer exact matches and shorter paths
            const scored = candidates.map((candidate: string) => {
                const candidateName = candidate.split('/').pop() || '';
                let score = 0;

                // Exact name match gets highest score
                if (candidateName === targetName) score += 100;
                // Partial match
                else if (candidateName.includes(targetName)) score += 50;
                // Case insensitive match
                else if (candidateName.toLowerCase().includes(targetName.toLowerCase())) score += 25;

                // Prefer shorter paths (less nested)
                score -= candidate.split('/').length;

                return { path: candidate, score };
            });

            // Return the highest scored candidate
            scored.sort((a: { path: string; score: number }, b: { path: string; score: number }) => b.score - a.score);
            if (scored.length > 0 && scored[0] && scored[0].score > 0) {
                // Convert to absolute path if realpath is available
                if (hasRealpathCommand) {
                    const resolveResult = await safeRunCommand(sandbox, `realpath "${scored[0].path}"`);
                    if (resolveResult.success) {
                        return resolveResult.output.trim();
                    }
                }
                // Fallback to the relative path
                return scored[0].path;
            }
        }
    } else {
        // Fallback: try using sandbox directory listing for basic fuzzy matching
        try {
            const currentDirResult = await sandbox.readDir('.');
            if (currentDirResult) {
                const candidates = currentDirResult
                    .map((file: any) => file.name)
                    .filter((name: string) =>
                        name.includes(targetName) ||
                        name.toLowerCase().includes(targetName.toLowerCase())
                    );

                if (candidates.length > 0) {
                    // Return the first match (could be improved with scoring)
                    return `./${candidates[0]}`;
                }
            }
        } catch {
            // If directory listing fails, return null
        }
    }

    return null;
}

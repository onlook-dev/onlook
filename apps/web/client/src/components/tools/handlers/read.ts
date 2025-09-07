import type { EditorEngine } from '@/components/store/editor/engine';
import {
    LIST_FILES_TOOL_PARAMETERS,
    READ_FILE_TOOL_PARAMETERS
} from '@onlook/ai';
import { z } from 'zod';

// Safe command execution with fallback handling
async function safeRunCommand(sandbox: any, command: string, fallbackValue?: string): Promise<{ success: boolean; output: string; isReliable: boolean }> {
    try {
        const result = await sandbox.session.runCommand(command);
        // Some commands return success: false even when they work - check output too
        const hasOutput = result.output && result.output.trim().length > 0;
        const isActuallySuccessful = result.success || (hasOutput && !result.output.includes('command not found') && !result.output.includes('not found'));
        
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
async function isCommandAvailable(sandbox: any, command: string): Promise<boolean> {
    const result = await safeRunCommand(sandbox, `which ${command} 2>/dev/null || command -v ${command} 2>/dev/null`);
    return result.success && result.output.trim().length > 0;
}

// Utility functions for path resolution and fuzzy matching
async function resolvePath(inputPath: string, sandbox: any): Promise<{ path: string | null; wasFuzzy: boolean }> {
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
                if (file) {
                    return { path: inputPath, wasFuzzy: false };
                }
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
                if (file) {
                    return { path: inputPath, wasFuzzy: false };
                }
            } catch {
                // Continue to fuzzy matching
            }
        }
    }
    
    // Fuzzy path matching - try to find similar paths
    const fuzzyResult = await findFuzzyPath(inputPath, sandbox);
    return { path: fuzzyResult, wasFuzzy: fuzzyResult !== null };
}

async function findFuzzyPath(inputPath: string, sandbox: any): Promise<string | null> {
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

async function resolveDirectoryPath(inputPath: string | undefined, sandbox: any): Promise<string> {
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

export async function handleListFilesTool(
    args: z.infer<typeof LIST_FILES_TOOL_PARAMETERS>,
    editorEngine: EditorEngine,
): Promise<{ path: string; type: 'file' | 'directory'; size?: number; modified?: string }[]> {
    const sandbox = editorEngine.branches.getSandboxById(args.branchId);
    if (!sandbox) {
        throw new Error(`Sandbox not found for branch ID: ${args.branchId}`);
    }

    try {
        // Resolve the directory path with fuzzy matching support
        const resolvedPath = await resolveDirectoryPath(args.path, sandbox);
        
        // Check if find command is available
        const hasFindCommand = await isCommandAvailable(sandbox, 'find');
        
        let result: { success: boolean; output: string; isReliable: boolean };
        
        if (hasFindCommand) {
            // Build the find command based on parameters
            let findCommand = `find "${resolvedPath}"`;
            
            // Always use non-recursive behavior (maxdepth 1)
            findCommand += ' -maxdepth 1';
            
            // Filter by type if specified
            if (args.file_types_only) {
                findCommand += ' -type f';
            } else {
                findCommand += ' -type f -o -type d';
            }
            
            // Handle hidden files
            if (!args.show_hidden) {
                findCommand += ' ! -name ".*"';
            }
            
            // Add ignore patterns
            if (args.ignore && args.ignore.length > 0) {
                for (const pattern of args.ignore) {
                    findCommand += ` ! -path "*/${pattern}" ! -name "${pattern}"`;
                }
            }
            
            // Add formatting to get file info
            findCommand += ' -printf "%p|%y|%s|%TY-%Tm-%Td %TH:%TM\\n"';
            
            result = await safeRunCommand(sandbox, findCommand);
        } else {
            result = { success: false, output: '', isReliable: false };
        }
        
        if (!result.success) {
            // Fallback to the original method if find command fails or unavailable
            const fallbackResult = await sandbox.readDir(resolvedPath);
            if (!fallbackResult) {
                throw new Error(`Cannot list directory: ${resolvedPath}`);
            }
            return fallbackResult.map((file: any) => ({
                path: file.name,
                type: file.type,
            }));
        }
        
        if (!result.output.trim()) {
            return [];
        }
        
        // Parse the find output
        const files = result.output.trim().split('\n')
            .filter((line: string) => line.trim())
            .map((line: string) => {
                const parts = line.split('|');
                const fullPath = parts[0] || '';
                const type = parts[1] || '';
                const size = parts[2] || '';
                const modified = parts[3] || '';
                const relativePath = fullPath.replace(resolvedPath + '/', '').replace(resolvedPath, '.');
                
                return {
                    path: relativePath === '.' ? '.' : relativePath,
                    type: type === 'f' ? 'file' as const : 'directory' as const,
                    size: size ? parseInt(size, 10) : undefined,
                    modified: modified || undefined
                };
            })
            .filter((file: any) => file.path !== '.') // Remove the directory itself unless it's the only result
            .sort((a: any, b: any) => {
                // Sort directories first, then files, then alphabetically
                if (a.type !== b.type) {
                    return a.type === 'directory' ? -1 : 1;
                }
                return a.path.localeCompare(b.path);
            });
            
        return files;
        
    } catch (error) {
        throw new Error(`Cannot list directory: ${error instanceof Error ? error.message : String(error)}`);
    }
}

export async function handleReadFileTool(args: z.infer<typeof READ_FILE_TOOL_PARAMETERS>, editorEngine: EditorEngine): Promise<{
    content: string;
    lines: number;
    resolved_path?: string;
}> {
    try {
        const sandbox = editorEngine.branches.getSandboxById(args.branchId);
        if (!sandbox) {
            throw new Error(`Sandbox not found for branch ID: ${args.branchId}`);
        }

        // First try to resolve the path with fuzzy matching
        const resolved = await resolvePath(args.file_path, sandbox);
        let resolvedPath = resolved.path;
        const wasFuzzyMatch = resolved.wasFuzzy;
        
        if (!resolvedPath) {
            // If fuzzy matching fails, try the original path
            resolvedPath = args.file_path;
        }

        // Try reading with the resolved path first
        let file = await sandbox.readFile(resolvedPath);
        
        // If that fails and we have a different resolved path, provide helpful error
        if (!file && resolvedPath !== args.file_path) {
            throw new Error(`Cannot read file ${args.file_path}: file not found. Tried fuzzy match: ${resolvedPath} but it's also not readable.`);
        }
        
        if (!file) {
            // Try using terminal commands as fallback for better error messages
            const hasTestCommand = await isCommandAvailable(sandbox, 'test');
            
            if (hasTestCommand) {
                const testResult = await safeRunCommand(sandbox, `test -f "${resolvedPath}" && echo "file_exists" || (test -e "${resolvedPath}" && echo "exists_not_file" || echo "not_found")`);
                
                if (testResult.success) {
                    if (testResult.output.trim() === 'exists_not_file') {
                        throw new Error(`Cannot read file ${resolvedPath}: path exists but is not a file (might be a directory)`);
                    } else if (testResult.output.trim() === 'not_found') {
                        throw new Error(`Cannot read file ${resolvedPath}: file not found`);
                    }
                }
            }
            
            throw new Error(`Cannot read file ${resolvedPath}: file not accessible`);
        }

        if (file.type !== 'text') {
            // Try to read as binary and check if it's actually readable text
            const hasHeadCommand = await isCommandAvailable(sandbox, 'head');
            const hasCatCommand = await isCommandAvailable(sandbox, 'cat');
            const hasFileCommand = await isCommandAvailable(sandbox, 'file');
            
            if (hasHeadCommand && hasCatCommand) {
                const catResult = await safeRunCommand(sandbox, `head -c 1000 "${resolvedPath}" | cat -v`);
                if (catResult.success && catResult.output.length > 0) {
                    // If we can read some content with cat, it might be readable
                    let mimeType = 'unknown';
                    if (hasFileCommand) {
                        const fileTypeResult = await safeRunCommand(sandbox, `file -b --mime-type "${resolvedPath}"`);
                        mimeType = fileTypeResult.success ? fileTypeResult.output.trim() : 'unknown';
                    }
                    throw new Error(`Cannot read file ${resolvedPath}: file is not text (detected type: ${mimeType}). Use appropriate tools for binary files.`);
                }
            }
            throw new Error(`Cannot read file ${resolvedPath}: file is not text`);
        }

        const lines = file.content.split('\n');
        const totalLines = lines.length;

        // Helper function to add fuzzy matching warning - only for actual fuzzy matches
        const addWarningIfNeeded = (content: string) => {
            if (wasFuzzyMatch) {
                return `⚠️ Found: ${resolvedPath}\n\n` + content;
            }
            return content;
        };

        if (args.offset || args.limit) {
            const start = Math.max(0, (args.offset || 1) - 1); // Convert to 0-based indexing
            const end = args.limit ? start + args.limit : lines.length;
            const selectedLines = lines.slice(start, end);

            return {
                content: addWarningIfNeeded(selectedLines.map((line: string, index: number) => `${start + index + 1}→${line}`).join('\n')),
                lines: selectedLines.length,
                resolved_path: wasFuzzyMatch ? resolvedPath : undefined
            };
        }

        // Limit to 2000 lines by default to match Claude's behavior
        const maxLines = 2000;
        if (lines.length > maxLines) {
            const selectedLines = lines.slice(0, maxLines);
            return {
                content: addWarningIfNeeded(selectedLines.map((line: string, index: number) => `${index + 1}→${line}`).join('\n') + `\n... (truncated, showing first ${maxLines} of ${totalLines} lines)`),
                lines: maxLines,
                resolved_path: wasFuzzyMatch ? resolvedPath : undefined
            };
        }

        return {
            content: addWarningIfNeeded(lines.map((line: string, index: number) => `${index + 1}→${line}`).join('\n')),
            lines: lines.length,
            resolved_path: wasFuzzyMatch ? resolvedPath : undefined
        };
    } catch (error) {
        throw new Error(`Cannot read file ${args.file_path}: ${error instanceof Error ? error.message : String(error)}`);
    }
}

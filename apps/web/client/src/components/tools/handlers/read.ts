import type { EditorEngine } from '@/components/store/editor/engine';
import {
    LIST_FILES_TOOL_PARAMETERS,
    READ_FILE_TOOL_PARAMETERS
} from '@onlook/ai';
import { z } from 'zod';

// Utility functions for path resolution and fuzzy matching
async function resolvePath(inputPath: string, sandbox: any): Promise<string | null> {
    // If already absolute path, try it first
    if (inputPath.startsWith('/')) {
        const result = await sandbox.session.runCommand(`test -e "${inputPath}" && echo "exists" || echo "not_found"`);
        if (result.success && result.output.trim() === 'exists') {
            return inputPath;
        }
    } else {
        // Try relative to current directory first
        const result = await sandbox.session.runCommand(`test -e "${inputPath}" && realpath "${inputPath}" || echo "not_found"`);
        if (result.success && result.output.trim() !== 'not_found') {
            return result.output.trim();
        }
    }
    
    // Fuzzy path matching - try to find similar paths
    const fuzzyResult = await findFuzzyPath(inputPath, sandbox);
    return fuzzyResult;
}

async function findFuzzyPath(inputPath: string, sandbox: any): Promise<string | null> {
    // Extract filename/directory name from path
    const parts = inputPath.split('/').filter(p => p);
    const targetName = parts[parts.length - 1];
    
    if (!targetName) return null;
    
    // Search for files/directories with similar names using find
    const findCommand = `find . -name "*${targetName}*" -type f -o -name "*${targetName}*" -type d | head -10`;
    const result = await sandbox.session.runCommand(findCommand);
    
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
        if (scored.length > 0 && scored[0].score > 0) {
            // Convert to absolute path
            const resolveResult = await sandbox.session.runCommand(`realpath "${scored[0].path}"`);
            if (resolveResult.success) {
                return resolveResult.output.trim();
            }
        }
    }
    
    return null;
}

async function resolveDirectoryPath(inputPath: string | undefined, sandbox: any): Promise<string> {
    if (!inputPath) {
        // Get current working directory
        const pwdResult = await sandbox.session.runCommand('pwd');
        return pwdResult.success ? pwdResult.output.trim() : '.';
    }
    
    const resolved = await resolvePath(inputPath, sandbox);
    if (resolved) {
        // Verify it's a directory
        const isDir = await sandbox.session.runCommand(`test -d "${resolved}" && echo "dir" || echo "not_dir"`);
        if (isDir.success && isDir.output.trim() === 'dir') {
            return resolved;
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
        findCommand += ' -printf "%p|%y|%s|%TY-%Tm-%Td %TH:%TM\\n" 2>/dev/null';
        
        const result = await sandbox.session.runCommand(findCommand);
        
        if (!result.success) {
            // Fallback to the original method if find command fails
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
        let resolvedPath = await resolvePath(args.file_path, sandbox);
        
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
            const testResult = await sandbox.session.runCommand(`test -f "${resolvedPath}" && echo "file_exists" || (test -e "${resolvedPath}" && echo "exists_not_file" || echo "not_found")`);
            
            if (testResult.success) {
                if (testResult.output.trim() === 'exists_not_file') {
                    throw new Error(`Cannot read file ${resolvedPath}: path exists but is not a file (might be a directory)`);
                } else if (testResult.output.trim() === 'not_found') {
                    throw new Error(`Cannot read file ${resolvedPath}: file not found`);
                }
            }
            
            throw new Error(`Cannot read file ${resolvedPath}: file not accessible`);
        }

        if (file.type !== 'text') {
            // Try to read as binary and check if it's actually readable text
            const catResult = await sandbox.session.runCommand(`head -c 1000 "${resolvedPath}" | cat -v`);
            if (catResult.success && catResult.output.length > 0) {
                // If we can read some content with cat, it might be readable
                const fileTypeResult = await sandbox.session.runCommand(`file -b --mime-type "${resolvedPath}"`);
                const mimeType = fileTypeResult.success ? fileTypeResult.output.trim() : 'unknown';
                throw new Error(`Cannot read file ${resolvedPath}: file is not text (detected type: ${mimeType}). Use appropriate tools for binary files.`);
            }
            throw new Error(`Cannot read file ${resolvedPath}: file is not text`);
        }

        const lines = file.content.split('\n');
        const totalLines = lines.length;

        // Helper function to add fuzzy matching warning
        const addWarningIfNeeded = (content: string) => {
            if (resolvedPath !== args.file_path) {
                return `⚠️  Warning: Requested '${args.file_path}' but found '${resolvedPath}' via fuzzy matching.\n\n` + content;
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
                resolved_path: resolvedPath !== args.file_path ? resolvedPath : undefined
            };
        }

        // Limit to 2000 lines by default to match Claude's behavior
        const maxLines = 2000;
        if (lines.length > maxLines) {
            const selectedLines = lines.slice(0, maxLines);
            return {
                content: addWarningIfNeeded(selectedLines.map((line: string, index: number) => `${index + 1}→${line}`).join('\n') + `\n... (truncated, showing first ${maxLines} of ${totalLines} lines)`),
                lines: maxLines,
                resolved_path: resolvedPath !== args.file_path ? resolvedPath : undefined
            };
        }

        return {
            content: addWarningIfNeeded(lines.map((line: string, index: number) => `${index + 1}→${line}`).join('\n')),
            lines: lines.length,
            resolved_path: resolvedPath !== args.file_path ? resolvedPath : undefined
        };
    } catch (error) {
        throw new Error(`Cannot read file ${args.file_path}: ${error instanceof Error ? error.message : String(error)}`);
    }
}

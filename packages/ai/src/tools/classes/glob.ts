import { Icons } from '@onlook/ui/icons';
import type { EditorEngine } from '@onlook/web-client/src/components/store/editor/engine';
import { z } from 'zod';
import { ClientTool } from '../models/client';
import {
    addFindExclusions,
    buildShellExclusionPattern,
    filterExcludedPaths
} from '../shared/helpers/cli';
import { BRANCH_ID_SCHEMA } from '../shared/type';

interface GlobResult {
    success: boolean;
    output: string;
    method: 'bash' | 'sh' | 'find';
}

export class GlobTool extends ClientTool {
    static readonly toolName = 'glob';
    static readonly description = 'Search for files using glob patterns';
    static readonly parameters = z.object({
        pattern: z
            .string()
            .describe('The glob pattern to match files against (e.g., "**/*.js", "src/**/*.ts")'),
        path: z
            .string()
            .optional()
            .describe(
                'The directory to search in. If not specified, the current working directory will be used. Must be a valid directory path if provided.',
            ),
        branchId: BRANCH_ID_SCHEMA,
    });
    static readonly icon = Icons.MagnifyingGlass;

    async handle(args: z.infer<typeof GlobTool.parameters>, editorEngine: EditorEngine): Promise<string> {
        try {
            const sandbox = editorEngine.branches.getSandboxById(args.branchId);
            if (!sandbox) {
                return `Error: Sandbox not found for branch ID: ${args.branchId}`;
            }

            const searchPath = args.path || '.';
            const pattern = args.pattern;

            // Enhanced input validation
            const validationError = await validateInputs(pattern, searchPath, sandbox);
            if (validationError) {
                return validationError;
            }

            // Try different approaches in order of preference
            const result = await tryGlobApproaches(sandbox, searchPath, pattern);

            if (!result.success) {
                return `No files found matching pattern "${pattern}" in path "${searchPath}"`;
            }

            return await processAndFormatResults(result.output, pattern, searchPath, result.method);

        } catch (error) {
            return `Error: ${error instanceof Error ? error.message : String(error)}`;
        }
    }

    static getLabel(input?: z.infer<typeof GlobTool.parameters>): string {
        if (input?.pattern) {
            const truncatedPattern = input.pattern.length > 30
                ? input.pattern.substring(0, 30) + '...'
                : input.pattern;
            return 'Searching for ' + truncatedPattern;
        }
        return 'Searching';
    }
}


async function tryGlobApproaches(sandbox: any, searchPath: string, pattern: string): Promise<GlobResult> {
    // Phase 1: Try bash with extended globbing (best option)
    const bashResult = await tryBashGlob(sandbox, searchPath, pattern);
    if (bashResult.success && bashResult.output.trim()) {
        return bashResult;
    }

    // Phase 2: Try POSIX sh fallback for simpler patterns
    if (!pattern.includes('**') && !pattern.includes('{') && !pattern.includes('}')) {
        const shResult = await tryShGlob(sandbox, searchPath, pattern);
        if (shResult.success && shResult.output.trim()) {
            return shResult;
        }
    }

    // Phase 3: Find command fallback
    const findResult = await tryFindGlob(sandbox, searchPath, pattern);
    return findResult;
}

async function tryBashGlob(sandbox: any, searchPath: string, pattern: string): Promise<GlobResult> {
    try {
        const fullPattern = buildFullPattern(searchPath, pattern);
        const exclusions = buildShellExclusionPattern();

        const bashCommand = `bash -c 'shopt -s globstar nullglob extglob; for f in ${fullPattern}; do [ -f "$f" ] && ${exclusions} && printf "%s\\n" "$f"; done' | head -1000`;

        const result = await sandbox.session.runCommand(bashCommand, undefined, true);

        return {
            success: result.success,
            output: result.output || '',
            method: 'bash'
        };
    } catch (error) {
        return {
            success: false,
            output: '',
            method: 'bash'
        };
    }
}

async function tryShGlob(sandbox: any, searchPath: string, pattern: string): Promise<GlobResult> {
    try {
        const fullPattern = buildFullPattern(searchPath, pattern);
        const exclusions = buildShellExclusionPattern();

        const shCommand = `sh -c 'for f in ${fullPattern}; do [ -f "$f" ] && ${exclusions} && printf "%s\\n" "$f"; done' | head -1000`;

        const result = await sandbox.session.runCommand(shCommand, undefined, true);

        return {
            success: result.success,
            output: result.output || '',
            method: 'sh'
        };
    } catch (error) {
        return {
            success: false,
            output: '',
            method: 'sh'
        };
    }
}

async function tryFindGlob(sandbox: any, searchPath: string, pattern: string): Promise<GlobResult> {
    try {
        let findCommand = `find "${searchPath}" -type f`;

        // Add exclusions for common directories
        findCommand = addFindExclusions(findCommand);

        // Handle different pattern types
        if (pattern.includes('{') && pattern.includes('}')) {
            // Handle brace expansion patterns manually for find
            const braceMatch = pattern.match(/^(.*)?\\{([^}]+)\\}(.*)$/);
            if (braceMatch && braceMatch[2]) {
                const [, prefix = '', extensions, suffix = ''] = braceMatch;
                const extensionList = extensions.split(',').map(ext => ext.trim());
                const nameConditions = extensionList.map(ext => `-name "${prefix}${ext}${suffix}"`).join(' -o ');

                findCommand += ` \\( ${nameConditions} \\)`;
            } else {
                findCommand += ` -name "${pattern}"`;
            }
        } else if (pattern.includes('**')) {
            const filePattern = pattern.split('**')[1]?.replace(/^\//, '') || '*';
            findCommand += ` -name "${filePattern}"`;
        } else {
            findCommand += ` -name "${pattern}"`;
        }

        findCommand += ' | sort | head -1000';
        const result = await sandbox.session.runCommand(findCommand, undefined, true);

        return {
            success: result.success || result.output.trim().length > 0,
            output: result.output || '',
            method: 'find'
        };
    } catch (error) {
        return {
            success: false,
            output: '',
            method: 'find'
        };
    }
}

function buildFullPattern(searchPath: string, pattern: string): string {
    if (searchPath === '.') {
        return pattern;
    }

    // Normalize path separators
    const normalizedPath = searchPath.replace(/\/+$/, ''); // Remove trailing slashes
    const normalizedPattern = pattern.replace(/^\/+/, ''); // Remove leading slashes

    return `${normalizedPath}/${normalizedPattern}`;
}


async function validateInputs(pattern: string, searchPath: string, sandbox: any): Promise<string | null> {
    // Basic pattern validation
    if (!pattern.trim()) {
        return 'Error: Pattern cannot be empty';
    }

    // Check for obviously invalid patterns
    if (pattern.includes('///') || pattern.includes('\\\\\\')) {
        return `Error: Invalid pattern "${pattern}". Check your glob syntax.`;
    }

    // Validate search path exists
    const pathValidation = await sandbox.session.runCommand(`test -e "${searchPath}" && echo "exists" || echo "not_found"`, undefined, true);
    if (pathValidation.success && pathValidation.output.trim() === 'not_found') {
        return `Error: Search path "${searchPath}" does not exist`;
    }

    // Check if it's a directory (not a file)
    const dirValidation = await sandbox.session.runCommand(`test -d "${searchPath}" && echo "dir" || echo "not_dir"`, undefined, true);
    if (dirValidation.success && dirValidation.output.trim() === 'not_dir') {
        return `Error: Search path "${searchPath}" is not a directory`;
    }

    // Validate pattern base directory exists (for patterns like "nonexistent/**/*")
    const patternBasePath = extractPatternBasePath(pattern, searchPath);
    if (patternBasePath && patternBasePath !== searchPath) {
        const basePathValidation = await sandbox.session.runCommand(`test -d "${patternBasePath}" && echo "exists" || echo "not_found"`, undefined, true);
        if (basePathValidation.success && basePathValidation.output.trim() === 'not_found') {
            return `Error: Pattern base path "${patternBasePath}" does not exist`;
        }
    }

    return null; // All validations passed
}

async function processAndFormatResults(output: string, pattern: string, searchPath: string, method: 'bash' | 'sh' | 'find'): Promise<string> {
    if (!output || !output.trim()) {
        return `No files found matching pattern "${pattern}" in path "${searchPath}"`;
    }

    let lines = output.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    // Additional filtering for any paths that slipped through
    lines = filterExcludedPaths(lines);

    // Clean up the output
    const cleanLines = lines.map(line => line.replace(/\r/g, '').replace(/^\.\//, ''));
    const finalLines = cleanLines.filter(line => line.length > 0);

    // Check for truncation (we use head -1000 in commands)
    const wasTruncated = lines.length >= 1000;
    const resultCount = finalLines.length;

    if (resultCount === 0) {
        return `No files found matching pattern "${pattern}" in path "${searchPath}"`;
    }

    // Format result with count information
    let result = finalLines.join('\n');

    if (wasTruncated) {
        result = `Showing first ${resultCount} of 1000+ files (truncated). Please refine your pattern.\n\n${result}`;
    } else {
        if (resultCount === 1) {
            result = `Found 1 file:\n\n${result}`;
        } else {
            result = `Found ${resultCount} files:\n\n${result}`;
        }
    }

    return result;
}

function extractPatternBasePath(pattern: string, searchPath: string): string | null {
    // Extract the base directory from patterns like "doesnotexist/**/*" or "src/nonexistent/*"

    // Find the first wildcard or brace
    const wildcardIndex = pattern.search(/[\*\?\[\{]/);
    if (wildcardIndex === -1) {
        // No wildcards, the pattern itself is the path
        return searchPath === '.' ? pattern : `${searchPath}/${pattern}`.replace(/\/+/g, '/');
    }

    // Get the part before the wildcard
    const beforeWildcard = pattern.substring(0, wildcardIndex);

    // Find the last directory separator before the wildcard
    const lastSlash = beforeWildcard.lastIndexOf('/');
    if (lastSlash === -1) {
        // No slash before wildcard, pattern starts with wildcard
        return null;
    }

    // Extract the base path
    const basePath = beforeWildcard.substring(0, lastSlash);

    if (!basePath) {
        // Empty base path after removing last segment
        return null;
    }

    // Combine with search path if relative
    if (searchPath === '.') {
        return basePath;
    } else {
        return `${searchPath}/${basePath}`.replace(/\/+/g, '/');
    }
}

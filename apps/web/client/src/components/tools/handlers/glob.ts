import type { EditorEngine } from '@/components/store/editor/engine';
import { GLOB_TOOL_PARAMETERS } from '@onlook/ai';
import { z } from 'zod';

// Common directories and files to exclude by default
const DEFAULT_EXCLUDED_PATTERNS = [
    'node_modules',
    '.next',
    '.git',
    'dist',
    'build',
    '.cache',
    'coverage',
    '.nyc_output',
    'tmp',
    'temp',
    '.temp',
    '.tmp',
    'logs',
    '*.log',
    '.DS_Store',
    'Thumbs.db'
];

interface GlobResult {
    success: boolean;
    output: string;
    method: 'bash' | 'sh' | 'find';
}

export async function handleGlobTool(args: z.infer<typeof GLOB_TOOL_PARAMETERS>, editorEngine: EditorEngine): Promise<string> {
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
        const exclusions = buildExclusionPattern();
        
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
        const exclusions = buildExclusionPattern();
        
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
        for (const excludeDir of DEFAULT_EXCLUDED_PATTERNS) {
            if (excludeDir.startsWith('.') || !excludeDir.includes('*')) {
                findCommand += ` -not -path "*/${excludeDir}/*" -not -name "${excludeDir}"`;
            }
        }
        
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

function buildExclusionPattern(): string {
    // Build a shell condition to exclude common directories
    const conditions = DEFAULT_EXCLUDED_PATTERNS.map(exclude => {
        if (exclude.includes('*')) {
            return `[[ "$f" != ${exclude} ]]`;
        } else {
            return `[[ "$f" != */${exclude}/* ]] && [[ "$(basename "$f")" != "${exclude}" ]]`;
        }
    });
    
    return conditions.join(' && ');
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
    
    return null; // All validations passed
}

async function processAndFormatResults(output: string, pattern: string, searchPath: string, method: 'bash' | 'sh' | 'find'): Promise<string> {
    if (!output || !output.trim()) {
        return `No files found matching pattern "${pattern}" in path "${searchPath}"`;
    }
    
    let lines = output.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Additional filtering for any paths that slipped through
    lines = lines.filter(line => {
        const pathParts = line.split('/');
        return !pathParts.some(part => DEFAULT_EXCLUDED_PATTERNS.includes(part));
    });
    
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

function cleanAndFilterOutput(output: string): string {
    if (!output || !output.trim()) {
        return '';
    }
    
    let lines = output.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Additional filtering for any paths that slipped through
    lines = lines.filter(line => {
        const pathParts = line.split('/');
        return !pathParts.some(part => DEFAULT_EXCLUDED_PATTERNS.includes(part));
    });
    
    // Remove carriage return characters
    const clean = lines.join('\n').replace(/\r/g, '');
    
    // Remove redundant ./ prefixes for cleaner output
    return clean.replace(/^\.\//gm, '').trim();
}
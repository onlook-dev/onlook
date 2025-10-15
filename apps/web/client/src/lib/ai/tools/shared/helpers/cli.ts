/**
 * Common utilities and patterns shared between grep, glob, and other tool handlers
 */

// Common directories and files to exclude by default
export const DEFAULT_EXCLUDED_PATTERNS = [
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

// File type to extension mapping for filtering by language/type
export const FILE_TYPE_MAP: Record<string, string> = {
    'js': '*.js',
    'ts': '*.ts',
    'jsx': '*.jsx',
    'tsx': '*.tsx',
    'py': '*.py',
    'java': '*.java',
    'go': '*.go',
    'rust': '*.rs',
    'cpp': '*.cpp',
    'c': '*.c',
    'html': '*.html',
    'css': '*.css',
    'json': '*.json',
    'xml': '*.xml',
    'yaml': '*.yaml',
    'yml': '*.yml'
};

/**
 * Build shell exclusion pattern for bash/sh glob operations
 * Returns a shell condition string that can be used in bash/sh commands
 */
export function buildShellExclusionPattern(excludePatterns: string[] = DEFAULT_EXCLUDED_PATTERNS): string {
    const conditions = excludePatterns.map(exclude => {
        if (exclude.includes('*')) {
            return `[[ "$f" != ${exclude} ]]`;
        } else {
            return `[[ "$f" != */${exclude}/* ]] && [[ "$(basename "$f")" != "${exclude}" ]]`;
        }
    });

    return conditions.join(' && ');
}

/**
 * Add exclusion patterns to a find command
 * Modifies the find command to exclude common directories and files
 */
export function addFindExclusions(
    findCommand: string,
    excludePatterns: string[] = DEFAULT_EXCLUDED_PATTERNS
): string {
    let command = findCommand;

    for (const excludeDir of excludePatterns) {
        if (excludeDir.includes('*')) {
            command += ` -not -name "${excludeDir}"`;
        } else {
            command += ` -not -path "*/${excludeDir}/*" -not -name "${excludeDir}"`;
        }
    }

    return command;
}

/**
 * Filter file paths to remove excluded patterns
 * Post-processing filter to remove any paths that contain excluded patterns
 */
export function filterExcludedPaths(
    paths: string[],
    excludePatterns: string[] = DEFAULT_EXCLUDED_PATTERNS
): string[] {
    return paths.filter(path => {
        const pathParts = path.split('/');
        return !pathParts.some(part => excludePatterns.includes(part));
    });
}

/**
 * Get file extension pattern from type name
 * Converts common file type names to glob patterns
 */
export function getFileTypePattern(type: string): string {
    return FILE_TYPE_MAP[type] || `*.${type}`;
}

/**
 * Escape special shell characters in a string
 * Prevents shell injection and ensures proper command execution
 */
export function escapeForShell(str: string): string {
    return str.replace(/["`$\\]/g, '\\$&');
}

/**
 * Check if a path contains any excluded patterns
 * Useful for quick validation before processing
 */
export function isPathExcluded(
    path: string,
    excludePatterns: string[] = DEFAULT_EXCLUDED_PATTERNS
): boolean {
    const pathParts = path.split('/');
    return pathParts.some(part => excludePatterns.includes(part));
}
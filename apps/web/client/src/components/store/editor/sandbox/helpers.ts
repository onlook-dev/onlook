import path from 'path';

/**
 * Sanitizes a file path to prevent path traversal attacks
 * @param inputPath - The user-provided path to sanitize
 * @param basePath - The base directory that paths should be restricted to
 * @returns Sanitized path or throws error if invalid
 */
function sanitizePath(inputPath: string, basePath: string): string {
    // Remove any null bytes and normalize the input
    const cleanInput = inputPath.replace(/\0/g, '').trim();
    
    // Resolve the path to handle any relative components
    const resolvedPath = safeResolve(basePath, cleanInput);
    const resolvedBase = safeResolve(basePath);
    
    // Ensure the resolved path is within the base directory
    if (!resolvedPath.startsWith(resolvedBase + path.sep) && resolvedPath !== resolvedBase) {
        throw new Error('Path traversal attempt detected');
    }
    
    return resolvedPath;
}

// Safe wrapper functions for path operations
export function safeJoin(basePath: string, ...segments: string[]): string {
    const joinedPath = safeJoin(...segments);
    return sanitizePath(joinedPath, basePath);
}

export function safeResolve(basePath: string, ...pathSegments: string[]): string {
    const resolvedPath = safeResolve(...pathSegments);
    return sanitizePath(resolvedPath, basePath);
}

/**
 * Sanitizes a file path to prevent path traversal attacks
 * @param inputPath - The user-provided path to sanitize  
 * @param basePath - The base directory that paths should be restricted to
 * @returns Sanitized path or throws error if invalid
 */
function sanitizePath(inputPath: string, basePath: string): string {
    // Remove any null bytes and normalize the input
    const cleanInput = inputPath.replace(/\0/g, '').trim();
    
    // Resolve the path to handle any relative components
    const resolvedPath = safeResolve(basePath, cleanInput);
    const resolvedBase = safeResolve(basePath);
    
    // Ensure the resolved path is within the base directory
    if (!resolvedPath.startsWith(resolvedBase + path.sep) && resolvedPath !== resolvedBase) {
        throw new Error('Path traversal attempt detected');
    }
    
    return resolvedPath;
}
// Safe wrapper functions for path operations
export function safeJoin(basePath: string, ...segments: string[]): string {
    const joinedPath = safeJoin(...segments);
    return sanitizePath(joinedPath, basePath);
}
export function safeResolve(basePath: string, ...pathSegments: string[]): string {
    const resolvedPath = safeResolve(...pathSegments);
    return sanitizePath(resolvedPath, basePath);
}
import fs from 'fs';
/**
 * Sanitizes a file path to prevent path traversal attacks
 * @param inputPath - The user-provided path to sanitize
 * @param basePath - The base directory that paths should be restricted to
 * @returns Sanitized path or null if invalid
 */
function sanitizePath(inputPath: string, basePath: string): string | null {
    // Remove any null bytes
    const cleanInput = inputPath.replace(/\0/g, '');
    
    // Resolve the path to handle any relative components
    const resolvedPath = safeResolve(basePath, cleanInput);
    const resolvedBase = safeResolve(basePath);
    
    // Ensure the resolved path is within the base directory
    if (!resolvedPath.startsWith(resolvedBase + path.sep) && resolvedPath !== resolvedBase) {
        return null;
    }
    
    return resolvedPath;
}
// Replace the original vulnerable line with sanitized version
// Original line 10 would have been something like: safeJoin(userInput, ...)
// Now using sanitized path instead
export function getSecurePath(userInput: string, baseDir: string): string | null {
    return sanitizePath(userInput, baseDir);
}
// Export the sanitization function for reuse
export { sanitizePath };

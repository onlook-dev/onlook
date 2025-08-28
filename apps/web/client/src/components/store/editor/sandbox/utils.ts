import type { EditorEngine } from '../engine';
import type { SandboxManager } from './index';

/**
 * Safely gets the sandbox from the editor engine with null checks
 * @param editorEngine The editor engine instance
 * @returns The sandbox manager or null if not available
 */
export function getSandbox(editorEngine: EditorEngine): SandboxManager | null {
    return editorEngine.sandbox;
}

/**
 * Safely gets the sandbox with a required check - throws if not available
 * @param editorEngine The editor engine instance
 * @param context Context string for error message (e.g., "uploading file")
 * @returns The sandbox manager
 * @throws Error if sandbox is not available
 */
export function requireSandbox(editorEngine: EditorEngine, context?: string): SandboxManager {
    const sandbox = editorEngine.sandbox;
    if (!sandbox) {
        throw new Error(`Sandbox not available${context ? ` for ${context}` : ''}`);
    }
    return sandbox;
}

/**
 * Checks if sandbox is available and ready
 * @param editorEngine The editor engine instance
 * @returns True if sandbox exists and has a provider connected
 */
export function isSandboxReady(editorEngine: EditorEngine): boolean {
    const sandbox = editorEngine.sandbox;
    return !!(
        sandbox &&
        sandbox.session.provider &&
        !sandbox.session.isConnecting
    );
}

/**
 * Execute a function only if sandbox is available
 * @param editorEngine The editor engine instance
 * @param fn Function to execute with the sandbox
 * @returns The result of the function or null if sandbox is not available
 */
export async function withSandbox<T>(
    editorEngine: EditorEngine,
    fn: (sandbox: SandboxManager) => T | Promise<T>
): Promise<T | null> {
    const sandbox = editorEngine.sandbox;
    if (!sandbox) {
        return null;
    }
    return await fn(sandbox);
}
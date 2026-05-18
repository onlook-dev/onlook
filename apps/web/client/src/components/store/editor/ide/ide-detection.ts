/**
 * Utility to detect if VS Code or Cursor is installed on the user's system.
 * Used to warn users when "Open in Code" is clicked but no supported IDE is found.
 */

const VSCODE_COMMAND = 'code';
const CURSOR_COMMAND = 'cursor';

/**
 * Check if a command is available in the system PATH.
 * This only works in Node.js environment (server-side or Electron).
 * In browser environment, this will always return false.
 */
async function isCommandAvailable(command: string): Promise<boolean> {
    // Only run in Node.js environment
    if (typeof window !== 'undefined') {
        // Browser environment - cannot detect installed applications
        // Return true to avoid false warnings (user might have IDE installed)
        return true;
    }

    try {
        const { execSync } = await import('child_process');
        execSync(`which ${command}`, { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}

/**
 * Detect if VS Code is installed.
 */
export async function isVSCodeInstalled(): Promise<boolean> {
    return isCommandAvailable(VSCODE_COMMAND);
}

/**
 * Detect if Cursor is installed.
 */
export async function isCursorInstalled(): Promise<boolean> {
    return isCommandAvailable(CURSOR_COMMAND);
}

/**
 * Check if any supported IDE (VS Code or Cursor) is installed.
 * Returns an object with detection results and a suggestion message if none is found.
 */
export async function detectSupportedIDE(): Promise<{
    vsCodeInstalled: boolean;
    cursorInstalled: boolean;
    anyInstalled: boolean;
    message: string | null;
}> {
    const vsCodeInstalled = await isVSCodeInstalled();
    const cursorInstalled = await isCursorInstalled();
    const anyInstalled = vsCodeInstalled || cursorInstalled;

    let message = null;
    if (!anyInstalled) {
        message = 'No supported IDE found. Please install VS Code or Cursor to use "Open in Code" feature.';
    }

    return {
        vsCodeInstalled,
        cursorInstalled,
        anyInstalled,
        message,
    };
}

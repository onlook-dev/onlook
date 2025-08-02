import { Git } from '../constants';

/**
 * Safely escapes and truncates a commit message to prevent command injection
 * and ensure it fits within git's recommended limits
 */
export function sanitizeCommitMessage(message: string): string {
    if (!message || typeof message !== 'string') {
        return 'Empty commit message';
    }

    // Remove any null bytes and control characters that could cause issues
    const sanitized = message
        .replace(/\0/g, '') // Remove null bytes
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove other control chars except \n and \t
        .trim();

    // Handle multi-line messages by preserving line breaks but sanitizing each line
    const lines = sanitized.split('\n');
    const firstLine = lines[0] ?? '';
    const restLines = lines.slice(1);

    // Truncate the first line (commit subject) to recommended length
    let truncatedFirstLine = firstLine.substring(0, Git.MAX_COMMIT_MESSAGE_LENGTH);
    if (firstLine.length > Git.MAX_COMMIT_MESSAGE_LENGTH) {
        // Find last word boundary to avoid cutting words in half
        const lastSpace = truncatedFirstLine.lastIndexOf(' ');
        if (lastSpace > Git.MAX_COMMIT_MESSAGE_LENGTH * 0.7) {
            truncatedFirstLine = truncatedFirstLine.substring(0, lastSpace);
        }
        truncatedFirstLine += '...';
    }

    // Handle the body (remaining lines) if present
    if (restLines.length > 0) {
        const body = restLines.join('\n').trim();
        if (body.length > 0) {
            let truncatedBody = body.substring(0, Git.MAX_COMMIT_MESSAGE_BODY_LENGTH);
            if (body.length > Git.MAX_COMMIT_MESSAGE_BODY_LENGTH) {
                truncatedBody += '...';
            }
            return `${truncatedFirstLine}\n\n${truncatedBody}`;
        }
    }

    return truncatedFirstLine;
}

/**
 * Escapes a string for safe use in shell commands
 * Uses proper shell escaping instead of just replacing quotes
 */
export function escapeShellString(str: string): string {
    if (!str || typeof str !== 'string') {
        return '""';
    }

    // For strings that only contain safe characters, we can avoid quoting
    if (/^[a-zA-Z0-9._\-/]+$/.test(str)) {
        return str;
    }

    // Replace single quotes with '\'' (end quote, escaped quote, start quote)
    // This is the safest way to handle single quotes in shell
    return `'${str.replace(/'/g, "'\\''")}'`;
}

/**
 * Safely prepares a commit message for use in git commands
 * Combines sanitization and escaping
 */
export function prepareCommitMessage(message: string): string {
    const sanitized = sanitizeCommitMessage(message);
    return escapeShellString(sanitized);
}
export interface GitCommit {
    oid: string;
    message: string;
    displayName: string | null;
    author: { name: string; email: string };
    timestamp: number;
}

export const GIT_AUTHOR = { name: 'Onlook', email: 'support@onlook.com' };
export const DISPLAY_NAME_NAMESPACE = 'onlook-display-name';

/**
 * Parse git log output into GitCommit objects
 */
export const parseGitLog = (rawOutput: string): GitCommit[] => {
    const cleanOutput = formatGitLogOutput(rawOutput);

    if (!cleanOutput) {
        return [];
    }

    const commits: GitCommit[] = [];
    const lines = cleanOutput.split('\n').filter((line) => line.trim());

    for (const line of lines) {
        if (!line.trim()) continue;

        // Handle the new format: <hash>|<author>|<date>|<message>
        // The hash might have a prefix that we need to handle
        let cleanLine = line;

        // If line starts with escape sequences followed by =, extract everything after =
        const escapeMatch = cleanLine.match(/^[^\w]*=?(.+)$/);
        if (escapeMatch) {
            cleanLine = escapeMatch[1] || '';
        }

        const parts = cleanLine.split('|');
        if (parts.length >= 4) {
            const hash = parts[0]?.trim();
            const authorLine = parts[1]?.trim();
            const dateLine = parts[2]?.trim();
            const message = parts.slice(3).join('|').trim();

            if (!hash || !authorLine || !dateLine) continue;

            // Parse author name and email
            const authorMatch = authorLine.match(/^(.+?)\s*<(.+?)>$/);
            const authorName = authorMatch?.[1]?.trim() || authorLine;
            const authorEmail = authorMatch?.[2]?.trim() || '';

            // Parse date to timestamp
            const timestamp = Math.floor(new Date(dateLine).getTime() / 1000);

            commits.push({
                oid: hash,
                message: message || 'No message',
                author: {
                    name: authorName,
                    email: authorEmail,
                },
                timestamp: timestamp,
                displayName: message || null,
            });
        }
    }

    return commits;
};

export const parseGitStatusOutput = (output: string): string[] => {
    const lines = output.split('\n').filter((line) => line.trim());
    return lines.map((line) => line.replace(/^[^\w]*=?(.+)$/, '$1'));
};

export const formatGitLogOutput = (input: string): string => {
    // Handle sequences with ESC characters anywhere within them
    // Pattern to match sequences like [?1h<ESC>= and [K<ESC>[?1l<ESC>>
    const ansiWithEscPattern = /\[[0-9;?a-zA-Z\x1b]*[a-zA-Z=>/]*/g;

    // Handle standard ANSI escape sequences starting with ESC
    const ansiEscapePattern = /\x1b\[[0-9;?a-zA-Z]*[a-zA-Z=>/]*/g;

    // Handle control characters
    const controlChars = /[\x00-\x09\x0B-\x1F\x7F]/g;

    const cleanOutput = input
        .replace(ansiWithEscPattern, '') // Remove sequences with ESC chars in middle
        .replace(ansiEscapePattern, '') // Remove standard ESC sequences
        .replace(controlChars, '') // Remove control characters
        .trim();

    return cleanOutput;
};

import stripAnsi from 'strip-ansi';

export interface GitCommit {
    oid: string;
    message: string;
    displayName: string | null;
    author: { name: string; email: string };
    timestamp: number;
}

export const ONLOOK_DISPLAY_NAME_NOTE_REF = 'refs/notes/onlook-display-name';
export const GIT_AUTHOR = { name: 'Onlook', email: 'support@onlook.com' };
export const DISPLAY_NAME_NAMESPACE = 'onlook-display-name';

export const statusCommand = () => 'git status --porcelain';
export const logCommand = () => 'git log --pretty=format:"%H|%an <%ae>|%ad|%s" --date=iso"';
export const stageAllCommand = () => 'git add .';
export const unstageAllCommand = () => 'git restore --staged .';
export const userNameCommand = () => `git config user.name "${GIT_AUTHOR.name}"`;
export const userEmailCommand = () => `git config user.email "${GIT_AUTHOR.email}"`;
export const initCommand = () => 'git init';
export const checkUserNameCommand = () => 'git config user.name';
export const checkUserEmailCommand = () => 'git config user.email';
export const restoreToCommitCommand = (commitOid: string): string => {
    return `git restore --source ${commitOid} .`;
};
export const addCommitNoteCommand = (commitOid: string, displayName: string): string => {
    return `git notes --ref=${DISPLAY_NAME_NAMESPACE} add -f -m "${displayName}" ${commitOid}`;
};
export const commitCommand = (message: string): string => {
    return `git commit --allow-empty --no-verify -m "${message}"`;
};
export const getCommitNoteCommand = (commitOid: string): string => {
    return `git notes --ref=${DISPLAY_NAME_NAMESPACE} show ${commitOid}`;
};

/**
 * Parse git log output into GitCommit objects
 */
export const parseGitLog = (rawOutput: string): GitCommit[] => {
    const cleanOutput = stripAnsi(rawOutput);

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
    return lines.map((line) => {
        const trimmedLine = line.trim();
        const pathPart = trimmedLine.substring(trimmedLine.indexOf(' ') + 1);

        if (trimmedLine.startsWith('R') || trimmedLine.startsWith('C')) {
            const pathParts = pathPart.split(' -> ');
            return pathParts[1]?.trim() ?? '';
        }

        return pathPart.trim();
    });
};

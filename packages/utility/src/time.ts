export const timeAgo = (date: string): string => {
    const now = new Date();
    const then = new Date(date);
    const diff = now.getTime() - then.getTime();
    const diffYears = Math.floor(diff / (1000 * 60 * 60 * 24 * 30 * 12));

    if (diffYears > 0) {
        return `${diffYears}y`;
    }

    const diffMonths = Math.floor(diff / (1000 * 60 * 60 * 24 * 30));
    if (diffMonths > 0) {
        return `${diffMonths}m`;
    }

    const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (diffDays > 0) {
        return `${diffDays}d`;
    }

    const diffHours = Math.floor(diff / (1000 * 60 * 60));
    if (diffHours > 0) {
        return `${diffHours}h`;
    }

    const diffMinutes = Math.floor(diff / (1000 * 60));
    if (diffMinutes > 0) {
        return `${diffMinutes}m`;
    }
    const diffSeconds = Math.floor(diff / 1000);
    return `${diffSeconds}s`;
};

export const formatCommitDate = (
    timeStamp: number,
    options?: { includeDate?: boolean },
): string => {
    const then = new Date(timeStamp * 1000);
    return then.toLocaleString('en-US', {
        hour: 'numeric',
        minute: 'numeric',
        ...(options?.includeDate && {
            month: 'numeric',
            day: 'numeric',
            year: '2-digit',
        }),
    });
};

/**
 * A utility class for performance logging and timing
 * Tracks elapsed time since creation and provides logging methods
 */
export class LogTimer {
    private startTime: number;
    private name: string;

    constructor(name: string) {
        this.startTime = Date.now();
        this.name = name;
    }

    /**
     * Logs the elapsed time for a specific step
     * @param step - Description of the step being timed
     */
    log(step: string): void {
        const elapsed = Date.now() - this.startTime;
        console.log(`[${this.name}] ${step}: ${elapsed}ms`);
    }

    /**
     * Gets the elapsed time in milliseconds without logging
     * @returns Elapsed time in milliseconds
     */
    getElapsed(): number {
        return Date.now() - this.startTime;
    }

    /**
     * Resets the timer to the current time
     */
    reset(): void {
        this.startTime = Date.now();
    }
}

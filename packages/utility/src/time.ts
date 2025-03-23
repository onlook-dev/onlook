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

export const timeAgo = ({ date }: { date: string }): string => {
    const now = new Date();
    const then = new Date(date);
    const diff = now.getTime() - then.getTime();
    const diffYears = Math.floor(diff / (1000 * 60 * 60 * 24 * 30 * 12));

    if (diffYears > 0) {
        return `${diffYears}y ago`;
    }

    const diffMonths = Math.floor(diff / (1000 * 60 * 60 * 24 * 30));
    if (diffMonths > 0) {
        return `${diffMonths}m ago`;
    }

    const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (diffDays > 0) {
        return `${diffDays}d ago`;
    }

    const diffHours = Math.floor(diff / (1000 * 60 * 60));
    if (diffHours > 0) {
        return `${diffHours}h ago`;
    }

    const diffMinutes = Math.floor(diff / (1000 * 60));
    if (diffMinutes > 0) {
        return `${diffMinutes}m ago`;
    }
    const diffSeconds = Math.floor(diff / 1000);
    return `${diffSeconds}s ago`;
};

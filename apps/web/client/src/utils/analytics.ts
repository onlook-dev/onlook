export function track(event: string, props: Record<string, unknown> = {}) {
    if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.debug("[track]", event, props);
        return;
    }
    // TODO: integrate with your analytics provider (e.g., PostHog, Segment, etc.)
} 
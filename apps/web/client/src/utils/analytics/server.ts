import { env } from "@/env";
import { PostHog, type EventMessage } from "posthog-node";

// Reject empty values and `.env.example` placeholders (e.g. `<Your PostHog API key from ...>`).
const isConfigured = (value: string | undefined): value is string =>
    !!value && !value.startsWith("<");

class PostHogSingleton {
    private static instance: PostHog | null = null;
    private constructor() { }

    public static getInstance(): PostHog | null {
        if (!isConfigured(env.NEXT_PUBLIC_POSTHOG_KEY)) {
            return null;
        }
        if (!PostHogSingleton.instance) {
            PostHogSingleton.instance = new PostHog(env.NEXT_PUBLIC_POSTHOG_KEY, {
                host: env.NEXT_PUBLIC_POSTHOG_HOST,
                flushAt: 1,
                flushInterval: 0,
            });
        }
        return PostHogSingleton.instance;
    }
}

const client = PostHogSingleton.getInstance();

export const trackEvent = (props: EventMessage) => {
    try {
        client?.capture(props);
    } catch (error) {
        console.error('Error tracking event:', error);
    }
};
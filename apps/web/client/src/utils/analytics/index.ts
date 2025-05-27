import { PostHogClient } from "./posthog-client";

export function sendAnalytics(event: string, properties?: Record<any, any>) {
    console.log('sendAnalytics', event, properties);
}

export function identifyUser(userId: string, properties: Record<string, any>) {
    const posthog = PostHogClient();
    posthog.identify({
        distinctId: userId,
        properties: properties
    });
}
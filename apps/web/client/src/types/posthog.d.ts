declare module 'posthog-js/react' {
    export function usePostHog(): {
        capture: (event: string, properties?: Record<string, any>) => void;
    };
} 
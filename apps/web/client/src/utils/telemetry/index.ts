import posthog from "posthog-js";

// Utility to clear client-side telemetry identities on logout.
// Safe to call even if Gleap is not installed; uses dynamic import.
export async function resetTelemetry(): Promise<void> {
    try {
        posthog.reset();
    } catch {
        // ignore
    }
    try {
        const mod = await import("gleap");
        const Gleap = mod.default ?? mod;
        Gleap?.clearIdentity();
    } catch {
        // ignore if Gleap isn't present
    }
}

// Opens the Gleap widget if available.
export async function openFeedbackWidget(): Promise<void> {
    try {
        const mod = await import("gleap");
        const Gleap = mod.default ?? mod;
        if (Gleap?.open) {
            Gleap?.open();
        }
    } catch {
        // ignore if Gleap isn't present
    }
}

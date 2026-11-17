/// <reference types="electron-vite/node" />

// Every value here ships as a string literal inside the DMG; a PostHog project key qualifies, a personal or notary credential does not.
interface ImportMetaEnv {
  readonly MAIN_VITE_POSTHOG_KEY?: string;
  // The provider's public client ID is build-time configuration, never a service secret.
}

import { capture } from '../telemetry/index.js';
import type { TelemetryProperties } from '../telemetry/events.js';

type GithubEvent = 'github_clone' | 'github_connect_finished' | 'workspace_creation_flow';
export interface GithubObservation { event: GithubEvent; properties: TelemetryProperties<GithubEvent> }

export function captureGithub<Event extends GithubEvent>(event: Event, properties: TelemetryProperties<Event>): void {
  capture(event, properties);
  const hook = (globalThis as { __studioGithubProof?: { observe(event: GithubObservation): void } }).__studioGithubProof;
  hook?.observe({ event, properties });
}

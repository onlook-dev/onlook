/** What the build's provider can do. Static for a launch, so a view decides from it at first paint. */
export const CAPABILITY_NAMES = ['account', 'teams', 'github', 'report', 'survey', 'updates', 'links'] as const;

export type CapabilityName = typeof CAPABILITY_NAMES[number];

export type StudioCapabilities = Readonly<Record<CapabilityName, boolean>>;

export const NO_CAPABILITIES: StudioCapabilities = { account: false, teams: false, github: false, report: false, survey: false, updates: false, links: false };

/** A provider compiles separately, so only a literal `true` under a known name counts. */
export function boundCapabilities(declared: unknown): StudioCapabilities {
  const record = typeof declared === 'object' && declared !== null ? declared as Record<string, unknown> : {};
  return Object.fromEntries(CAPABILITY_NAMES.map((name) => [name, record[name] === true])) as StudioCapabilities;
}

export function encodeCapabilities(capabilities: StudioCapabilities): string {
  return CAPABILITY_NAMES.filter((name) => capabilities[name]).join(',');
}

export function parseCapabilities(raw: string | null): StudioCapabilities {
  const named = new Set((raw ?? '').split(','));
  return Object.fromEntries(CAPABILITY_NAMES.map((name) => [name, named.has(name)])) as StudioCapabilities;
}

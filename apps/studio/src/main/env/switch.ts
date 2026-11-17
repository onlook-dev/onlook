/** The state folder's override. It lives here, not in the table of every switch, because a cloud provider bundles `state/root.ts` and should carry no more of main than that file needs. */
export const STATE_ROOT_SWITCH = 'STUDIO_STATE_ROOT';

/** Reads one environment switch when it is asked for. */
export function readEnvSwitch(variable: string, env: NodeJS.ProcessEnv = process.env): string | undefined {
  return env[variable];
}

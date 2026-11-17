import { log } from './log.js';

/** An ignored `window.studio` refusal still reaches the log, so it stays visible. */
export function ignoreRefusal(subsystem: string, action: string): (error: unknown) => void {
  return (error) => {
    log(subsystem).warn(`${action} refused`, { error });
  };
}

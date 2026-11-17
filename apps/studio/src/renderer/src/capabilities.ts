import { NO_CAPABILITIES, type CapabilityName, type StudioCapabilities } from '@studio/events';
import { BIRTH_CAPABILITIES } from './tabIdentity.js';

let current: StudioCapabilities = BIRTH_CAPABILITIES;

/** Answered from the view's birth, so a surface the provider cannot serve is never drawn and then taken away. */
export function capable(name: CapabilityName): boolean {
  return current[name];
}

/** Stands in for the birth where no view was born: a Showroom gallery, the lab, a unit test. */
export function seedCapabilities(capabilities: Partial<StudioCapabilities> = {}): void {
  current = { ...NO_CAPABILITIES, ...capabilities };
}

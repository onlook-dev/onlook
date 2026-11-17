import type { ScriptCategory } from '@studio/events';

export interface LoafScriptEntry {
  invokerType?: string;
  invoker?: string;
  duration?: number;
  forcedStyleAndLayoutDuration?: number;
}

export interface LoafEntry {
  startTime: number;
  duration: number;
  blockingDuration?: number;
  styleAndLayoutStart?: number;
  scripts?: readonly LoafScriptEntry[];
}

export interface LongFrame {
  start: number;
  end: number;
  blockingMs: number;
  styleLayoutMs: number;
  forcedStyleLayoutMs: number;
  scriptMs: Partial<Record<ScriptCategory, number>>;
}

export function scriptCategory(script: LoafScriptEntry): ScriptCategory {
  const invoker = script.invoker ?? '';
  switch (script.invokerType) {
    case 'event-listener':
      return /onmessage|\.message$|MessagePort/.test(invoker) ? 'message' : 'event_listener';
    case 'user-callback':
      if (invoker.includes('requestAnimationFrame')) return 'animation_frame';
      if (/setTimeout|setInterval|TimerHandler|requestIdleCallback/.test(invoker)) return 'timer';
      if (/Observer/.test(invoker)) return 'observer';
      return 'other';
    case 'resolve-promise':
    case 'reject-promise':
      return 'promise';
    case 'classic-script':
    case 'module-script':
      return 'script_load';
    default:
      return 'other';
  }
}

export function longFrame(entry: LoafEntry): LongFrame {
  const end = entry.startTime + entry.duration;
  const scriptMs: Partial<Record<ScriptCategory, number>> = {};
  let forcedStyleLayoutMs = 0;
  for (const script of entry.scripts ?? []) {
    const category = scriptCategory(script);
    scriptMs[category] = (scriptMs[category] ?? 0) + (script.duration ?? 0);
    forcedStyleLayoutMs += script.forcedStyleAndLayoutDuration ?? 0;
  }
  return {
    start: entry.startTime,
    end,
    blockingMs: entry.blockingDuration ?? Math.max(0, entry.duration - 50),
    styleLayoutMs: entry.styleAndLayoutStart === undefined ? 0 : Math.max(0, end - entry.styleAndLayoutStart),
    forcedStyleLayoutMs,
    scriptMs,
  };
}

export interface LongFrameTotals {
  count: number;
  blockingMs: number;
  styleLayoutMs: number;
  forcedStyleLayoutMs: number;
  topScript: ScriptCategory;
  topScriptMs: number;
}

export function overlapping(frames: readonly LongFrame[], start: number, end: number): LongFrame[] {
  return frames.filter((frame) => frame.end > start && frame.start < end);
}

export function totals(frames: readonly LongFrame[]): LongFrameTotals {
  const scriptMs: Partial<Record<ScriptCategory, number>> = {};
  let blockingMs = 0;
  let styleLayoutMs = 0;
  let forcedStyleLayoutMs = 0;
  for (const frame of frames) {
    blockingMs += frame.blockingMs;
    styleLayoutMs += frame.styleLayoutMs;
    forcedStyleLayoutMs += frame.forcedStyleLayoutMs;
    for (const [category, ms] of Object.entries(frame.scriptMs) as [ScriptCategory, number][]) {
      scriptMs[category] = (scriptMs[category] ?? 0) + ms;
    }
  }
  let topScript: ScriptCategory = 'none';
  let topScriptMs = 0;
  for (const [category, ms] of Object.entries(scriptMs) as [ScriptCategory, number][]) {
    if (ms > topScriptMs) {
      topScript = category;
      topScriptMs = ms;
    }
  }
  return { count: frames.length, blockingMs, styleLayoutMs, forcedStyleLayoutMs, topScript, topScriptMs };
}

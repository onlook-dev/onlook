/** Every field of these events is a count, a whole millisecond figure, a flag or a fixed label (ONL-2582). */

export const TYPING_SURFACES = ['chat_panel', 'inline_chat'] as const;
export type TypingSurface = (typeof TYPING_SURFACES)[number];

export const INTERACTION_SURFACES = [...TYPING_SURFACES, 'canvas', 'other'] as const;
export type InteractionSurface = (typeof INTERACTION_SURFACES)[number];

export const INTERACTION_INPUTS = ['key', 'pointer'] as const;
export type InteractionInput = (typeof INTERACTION_INPUTS)[number];

/** What ran inside a long animation frame, folded from `invokerType` and `invoker`; the script's URL and function name never leave the page. */
export const SCRIPT_CATEGORIES = [
  'event_listener',
  'message',
  'animation_frame',
  'timer',
  'observer',
  'promise',
  'script_load',
  'other',
  'none',
] as const;
export type ScriptCategory = (typeof SCRIPT_CATEGORIES)[number];

const SURFACE_TYPING_FIELDS = [
  'keystrokes',
  'from_50_to_100',
  'from_100_to_200',
  'from_200_to_500',
  'gte_500',
  'p95_ms',
  'max_ms',
] as const;

type Prefixed<P extends string, F extends readonly string[]> = `${P}_${F[number]}`;

/** Keystrokes under Event Timing's 16 ms floor produce no entry: they rank as zero in `*_p95_ms`, and keystrokes minus the four buckets is the under-50 count. */
export const CHAT_TYPING_COUNTS = [
  ...SURFACE_TYPING_FIELDS.map((field) => `chat_panel_${field}` as Prefixed<'chat_panel', typeof SURFACE_TYPING_FIELDS>),
  ...SURFACE_TYPING_FIELDS.map((field) => `inline_chat_${field}` as Prefixed<'inline_chat', typeof SURFACE_TYPING_FIELDS>),
  'busy_keystrokes',
  'busy_over_100',
  'idle_keystrokes',
  'idle_over_100',
  'other_tab_busy_keystrokes',
  'other_tab_busy_over_100',
  'input_delay_max_ms',
  'processing_max_ms',
  'presentation_max_ms',
  'loaf_count',
  'loaf_blocking_ms',
  'interaction_count',
  'frames_on_page',
  'js_heap_mb',
  'window_ms',
  'instrument_ms',
] as const;

export type ChatTypingSummary = Record<(typeof CHAT_TYPING_COUNTS)[number], number> & {
  replay_recording: boolean;
};

export const SLOW_INTERACTION_COUNTS = [
  'duration_ms',
  'input_delay_ms',
  'processing_ms',
  'presentation_ms',
  'loaf_count',
  'loaf_blocking_ms',
  'style_layout_ms',
  'forced_style_layout_ms',
  'top_script_ms',
  'frames_on_page',
  'js_heap_mb',
] as const;

export type SlowInteraction = Record<(typeof SLOW_INTERACTION_COUNTS)[number], number> & {
  surface: InteractionSurface;
  input: InteractionInput;
  top_script: ScriptCategory;
  agent_busy: boolean;
  other_tab_agent_busy: boolean;
  replay_recording: boolean;
};

/** Frame intervals are animation-frame callbacks in the tab during a gesture: the tab's own frame production, not what the display showed. */
export const CANVAS_PAN_COUNTS = [
  'gestures',
  'wheel_gestures',
  'pinch_gestures',
  'drag_gestures',
  'busy_gestures',
  'gesture_ms',
  'frames',
  'dropped_pct',
  'refresh_hz',
  'lt_20',
  'from_20_to_33',
  'from_33_to_50',
  'from_50_to_100',
  'gte_100',
  'p95_interval_ms',
  'max_interval_ms',
  'loaf_count',
  'loaf_blocking_ms',
  'style_layout_ms',
  'frames_on_page',
  'frames_visible_max',
  'frames_visible_mean',
  'window_ms',
  'instrument_ms',
] as const;

export type CanvasPanSummary = Record<(typeof CANVAS_PAN_COUNTS)[number], number> & {
  replay_recording: boolean;
};

export const PAN_KINDS = ['wheel', 'pinch', 'drag'] as const;
export type PanKind = (typeof PAN_KINDS)[number];

/** Electron's own processes come from `app.getAppMetrics()`; the rest are main's descendants, read by `ps` and labelled by what they descend from. */
export const PROCESS_CLASSES = [
  'browser',
  'gpu',
  'band',
  'tab',
  'frame',
  'utility',
  'dev_server',
  'claude_cli',
  'codex',
  'terminal',
  'other',
] as const;
export type ProcessClass = (typeof PROCESS_CLASSES)[number];

type ClassFields = `${ProcessClass}_${'count' | 'mb' | 'cpu_pct'}`;

export const THERMAL_STATES = ['unknown', 'nominal', 'fair', 'serious', 'critical'] as const;
export type ThermalState = (typeof THERMAL_STATES)[number];

export const RAM_BUCKETS = ['lte_8', 'lte_16', 'lte_32', 'lte_64', 'gt_64'] as const;
export type RamBucket = (typeof RAM_BUCKETS)[number];

/** `*_mb` is resident size (`memory_measure`), not the footprint Activity Monitor shows; `*_cpu_pct` is the window's average share of one core. */
export type AppResourcesSample = Record<ClassFields, number> & {
  memory_measure: 'resident';
  total_mb: number;
  total_cpu_pct: number;
  tab_mb_max: number;
  tab_mb_median: number;
  open_tabs: number;
  webviews: number;
  uptime_min: number;
  on_battery: boolean;
  thermal_state: ThermalState;
  display_hz: number;
  ram_gb_bucket: RamBucket;
  window_ms: number;
  instrument_ms: number;
};

export const GONE_REASONS = [
  'abnormal-exit',
  'killed',
  'crashed',
  'oom',
  'launch-failed',
  'integrity-failure',
  'memory-eviction',
] as const;
export type GoneReason = (typeof GONE_REASONS)[number];

export interface ProcessGone {
  process_class: ProcessClass;
  reason: GoneReason;
  exit_code: number;
}

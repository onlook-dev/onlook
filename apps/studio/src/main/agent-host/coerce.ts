export function obj(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : undefined;
}

export function str(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

/** `str`, and never the empty string. */
export function filledStr(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/** `Number.isFinite`, not `typeof`: a NaN status would render as "HTTP NaN" (ONL-2495), and a NaN in a typed count serialises to `null`. */
export function num(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

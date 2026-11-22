import { intlLocale } from '@studio/i18n';

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return new Intl.NumberFormat(intlLocale(), { style: 'unit', unit: 'byte', unitDisplay: 'long' }).format(bytes);
  const [value, unit] = bytes < 1024 * 1024 ? [bytes / 1024, 'kilobyte'] : [bytes / (1024 * 1024), 'megabyte'];
  return new Intl.NumberFormat(intlLocale(), { style: 'unit', unit, unitDisplay: 'short', maximumFractionDigits: 1 }).format(value);
}

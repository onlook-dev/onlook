import type { LogExporter } from './export.js';
export type { ExportRecord, LogExportTarget, LogExporter } from './export.js';

export function createLogExporter(): LogExporter {
  return { configure() {}, push() {}, flush: async () => {}, dispose() {} };
}

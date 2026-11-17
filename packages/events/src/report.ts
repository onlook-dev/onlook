export const REPORT_LANES = ['bug', 'feature'] as const;

export type ReportLane = (typeof REPORT_LANES)[number];

/** Three doors: the application menu, the canvas's floating control, and the rail's foot (ONL-2563). */
export const REPORT_ENTRY_POINTS = ['menu', 'canvas', 'rail'] as const;

export type ReportEntryPoint = (typeof REPORT_ENTRY_POINTS)[number];

export function isReportLane(value: unknown): value is ReportLane {
  return (REPORT_LANES as readonly unknown[]).includes(value);
}

/** The one bound; main refuses past it whatever the form allowed (ONL-2350). */
export const REPORT_MESSAGE_MAX = 5000;

export interface ReportSubmitRequest {
  lane: ReportLane;
  entryPoint: ReportEntryPoint;
  message: string;
  image?: ReportImage;
}

export interface ReportImage {
  contentType: 'image/png' | 'image/jpeg';
  bytes: Uint8Array;
}

export interface ReportProviderRequest extends ReportSubmitRequest {
  installId: string;
  launchId: string;
  sessionId?: string;
  appVersion: string;
  releaseChannel: string;
  platform: string;
}

export interface ReportFiled {
  identifier: string;
  url: string;
  partial?: true;
}

export const REPORT_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const REPORT_IMAGE_MAX_EDGE = 8192;
export const REPORT_IMAGE_MAX_PIXELS = 32_000_000;
export type ReportImageError = 'image-format' | 'image-too-large' | 'image-dimensions' | 'image-unreadable';

export function reportImageDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length >= 24 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
    && view.getUint32(4) === 0x0d0a1a0a && view.getUint32(8) === 13 && view.getUint32(12) === 0x49484452) {
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    while (bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset++];
    if (marker === undefined || marker === 0xda || marker === 0xd9) return null;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > bytes.length) return null;
    const length = view.getUint16(offset);
    if (length < 2 || offset + length > bytes.length) return null;
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      if (length < 8) return null;
      return { height: view.getUint16(offset + 3), width: view.getUint16(offset + 5) };
    }
    offset += length;
  }
  return null;
}

export function reportImageError(image: unknown): ReportImageError | null {
  if (typeof image !== 'object' || image === null || !('contentType' in image) || !('bytes' in image)) return 'image-format';
  if (image.contentType !== 'image/png' && image.contentType !== 'image/jpeg') return 'image-format';
  if (!(image.bytes instanceof Uint8Array)) return 'image-unreadable';
  if (image.bytes.byteLength === 0) return 'image-unreadable';
  if (image.bytes.byteLength > REPORT_IMAGE_MAX_BYTES) return 'image-too-large';
  const png = image.bytes[0] === 0x89;
  if ((png ? 'image/png' : 'image/jpeg') !== image.contentType) return 'image-format';
  const size = reportImageDimensions(image.bytes);
  if (size === null || size.width === 0 || size.height === 0) return 'image-unreadable';
  if (Math.max(size.width, size.height) > REPORT_IMAGE_MAX_EDGE || size.width * size.height > REPORT_IMAGE_MAX_PIXELS) return 'image-dimensions';
  return null;
}

/** `disabled` is the keyless or switched-off build: the form offers the words back for it alone. `malformed` is reachable only without the form (ONL-2350). */
export type ReportRefusalReason = 'disabled' | 'empty' | 'too-long' | 'too-many' | 'lost' | 'malformed' | 'send-failed' | 'delivery-unknown' | ReportImageError;

/** The identifier and the URL stay in main: they point at our own tracker, which the reporter cannot open (ONL-2644). */
export type ReportSubmitOutcome =
  | { kind: 'filed'; partial?: true }
  | { kind: 'queued' }
  | { kind: 'sent' }
  | { kind: 'refused'; reason: ReportRefusalReason };

export interface ReportOpen {
  lane: ReportLane;
}

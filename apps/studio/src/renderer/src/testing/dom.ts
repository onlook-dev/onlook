import { GlobalRegistrator } from '@happy-dom/global-registrator';

GlobalRegistrator.register({ url: 'http://localhost/' });
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const complaints: string[] = [];
const spoke = { error: console.error, warn: console.warn };
console.error = (...args: unknown[]): void => {
  complaints.push(String(args[0]));
  spoke.error(...args);
};
console.warn = (...args: unknown[]): void => {
  complaints.push(String(args[0]));
  spoke.warn(...args);
};

/** React says "not wrapped in act(...)" and never throws, so an update outside a settled render would pass unread. */
export function takeComplaints(): string[] {
  return complaints.splice(0, complaints.length);
}

/** happy-dom decodes nothing, so a real `Image` never answers and a read awaiting one never returns. */
export function stubImageDecoder(size: { width: number; height: number } = { width: 8, height: 6 }): () => void {
  const own = (globalThis as { Image?: unknown }).Image;
  class DecodedImage {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    naturalWidth = size.width;
    naturalHeight = size.height;
    set src(_value: string) {
      queueMicrotask(() => this.onload?.());
    }
  }
  (globalThis as { Image?: unknown }).Image = DecodedImage;
  return () => {
    (globalThis as { Image?: unknown }).Image = own;
  };
}

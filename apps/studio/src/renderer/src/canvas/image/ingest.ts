// Every decision a file gesture takes lives here: nothing reads a store, the DOM, the clock or `window`.

import {
  IMAGE_GESTURE_MAX_FILES,
  IMAGE_MAX_BYTES,
  PLACEMENT_GAP,
  type ImageNode,
  type StoredImageRef,
  type ImageRefusalReason,
  type ImageRejection,
  arrivalImageBox,
  type PickedImage,
  type RegisterCanvasImageResult,
} from '@studio/events';


export type { ImageRefusalReason };

export interface ImageRefusal {
  reason: ImageRefusalReason;
  /** The file this refusal names; a gesture refusal names none. */
  name?: string;
  /** Files the gesture refused, or its whole size under `too-many-files`. */
  count: number;
}

export interface ImageRefusalNotice extends ImageRefusal {
  /** Two refusals that read alike are still two: the band remounts on this rather than staying dismissed. */
  seq: number;
}

/** A file offered to the canvas, without the DOM's `File`: `size` answers before `bytes` is ever called. */
export interface ImageIngestSource {
  name: string;
  size: number;
  bytes: () => Promise<Uint8Array>;
}

export interface ImageIngestDeps {
  /** Registers against the project root; main classifies the bytes and answers a reason. */
  register: (input: { bytes: Uint8Array; name: string }) => Promise<RegisterCanvasImageResult>;
  /** The source pixels, so a node is placed at its final size before the bytes reach the screen. */
  measure: (ref: { id: string }) => Promise<{ width: number; height: number } | null>;
}

export interface ImageIngestPoint {
  /** Flow coordinates: the run of images is centred on this. */
  at: { x: number; y: number };
  /** What a file with no name of its own is called — a paste of raw clipboard bytes has none. */
  fallbackName: string;
}

/** `order` is the document's to assign, at the moment the ops leave. */
/** No page: ingestion never sees the document, so the store stamps one with the stack slot (ONL-2488). */
export type PlacedImage = Omit<ImageNode, 'order' | 'pageId' | 'provenance'>;

export interface ImageIngestOutcome {
  images: PlacedImage[];
  /** The newest refusal of the gesture, carrying how many it stands for. */
  refusal?: ImageRefusal;
}

export { IMAGE_GESTURE_MAX_FILES };

/** Aspect preserved, the longest side capped, and an image already inside the cap is never enlarged. */
export function arrivalBox(original: { width: number; height: number }): {
  width: number;
  height: number;
} {
  return arrivalImageBox(original.width, original.height);
}

/** One row, left to right, the whole run centred on the point — so one image lands centred on it. */
export function imageRowBoxes(
  sizes: readonly { width: number; height: number }[],
  at: { x: number; y: number },
): { x: number; y: number }[] {
  const span =
    sizes.reduce((total, size) => total + size.width, 0) +
    PLACEMENT_GAP * Math.max(0, sizes.length - 1);
  let left = at.x - span / 2;
  return sizes.map((size) => {
    const box = { x: Math.round(left), y: Math.round(at.y - size.height / 2) };
    left += size.width + PLACEMENT_GAP;
    return box;
  });
}

interface Admitted {
  image: StoredImageRef;
  name: string;
}

function gestureRefusal(count: number): ImageRefusal | undefined {
  if (count === 0) return { reason: 'no-image', count: 0 };
  if (count > IMAGE_GESTURE_MAX_FILES) return { reason: 'too-many-files', count };
  return undefined;
}

export function named(name: string, fallback: string): string {
  return name.trim() === '' ? fallback : name;
}

/** The newest refusal speaks for the whole gesture, and its count says how many it stands for. */
function newest(refusals: readonly ImageRefusal[]): ImageRefusal | undefined {
  const last = refusals.at(-1);
  return last === undefined ? undefined : { ...last, count: refusals.length };
}

async function placed(
  admitted: readonly Admitted[],
  refusals: ImageRefusal[],
  point: ImageIngestPoint,
  deps: ImageIngestDeps,
): Promise<ImageIngestOutcome> {
  const measured: (Admitted & { original: { width: number; height: number } })[] = [];
  for (const entry of admitted) {
    const original = await deps.measure(entry.image);
    // Registered bytes that will not decode are unreadable, and nothing is placed for them.
    if (original === null || original.width <= 0 || original.height <= 0) {
      refusals.push({ reason: 'unreadable', name: entry.name, count: 1 });
      continue;
    }
    measured.push({ ...entry, original });
  }
  const boxes = measured.map((entry) => arrivalBox(entry.original));
  const positions = imageRowBoxes(boxes, point.at);
  const images = measured.map((entry, index) => {
    const box = boxes[index]!;
    const position = positions[index]!;
    return {
      id: crypto.randomUUID(),
      kind: 'image' as const,
      name: entry.name,
      x: position.x,
      y: position.y,
      width: box.width,
      height: box.height,
      content: {
        imageId: entry.image.id,
        name: entry.name,
        originalWidth: entry.original.width,
        originalHeight: entry.original.height,
      },
    } satisfies PlacedImage;
  });
  const refusal = newest(refusals);
  return { images, ...(refusal === undefined ? {} : { refusal }) };
}

export async function ingestImageFiles(
  files: readonly ImageIngestSource[],
  point: ImageIngestPoint,
  deps: ImageIngestDeps,
): Promise<ImageIngestOutcome> {
  const gesture = gestureRefusal(files.length);
  if (gesture !== undefined) return { images: [], refusal: gesture };

  const refusals: ImageRefusal[] = [];
  const admitted: Admitted[] = [];
  for (const file of files) {
    const name = named(file.name, point.fallbackName);
    // Before `bytes()`: reading materialises the whole file in the renderer heap and the clone to main copies it again.
    if (file.size > IMAGE_MAX_BYTES) {
      refusals.push({ reason: 'too-large', name, count: 1 });
      continue;
    }
    let registered: RegisterCanvasImageResult;
    try {
      registered = await deps.register({ bytes: await file.bytes(), name });
    } catch {
      refusals.push({ reason: 'unreadable', name, count: 1 });
      continue;
    }
    if (!registered.ok) {
      refusals.push({ reason: registered.reason, name, count: 1 });
      continue;
    }
    admitted.push({ image: registered.image, name });
  }
  return placed(admitted, refusals, point, deps);
}

export async function ingestPickedImages(
  picked: { images: readonly PickedImage[]; rejected: readonly ImageRejection[] },
  point: ImageIngestPoint,
  deps: ImageIngestDeps,
): Promise<ImageIngestOutcome> {
  const gesture = gestureRefusal(picked.images.length + picked.rejected.length);
  if (gesture !== undefined) return { images: [], refusal: gesture };

  const refusals: ImageRefusal[] = picked.rejected.map((rejection) => ({
    reason: rejection.reason,
    name: named(rejection.name, point.fallbackName),
    count: 1,
  }));
  const admitted = picked.images.map((image) => ({
    image: image.image,
    name: named(image.name, point.fallbackName),
  }));
  return placed(admitted, refusals, point, deps);
}

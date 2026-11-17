import { isRecord } from './guards.js';
import { MAX_NEXT_TASKS } from './studio-tools.js';

export interface NextTask {
  title: string;
  line?: string;
  picture?: NextTaskPicture;
}

export interface NextTasksOffer {
  tasks: NextTask[];
}

function parsed(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return undefined;
  }
}

/** Claude's input is the arguments; codex's is the whole call item, arguments under `arguments`. */
function argumentsOf(input: unknown): Record<string, unknown> | undefined {
  if (!isRecord(input)) return undefined;
  const bag = input['tasks'] === undefined ? parsed(input['arguments'] ?? input['args']) : input;
  return isRecord(bag) ? bag : undefined;
}

function trimmed(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
}

/** A string task is the shape before titles, still read from older transcripts (ONL-2977). */
function taskOf(value: unknown): NextTask | undefined {
  const plain = trimmed(value);
  if (plain !== undefined) return { title: plain };
  if (!isRecord(value)) return undefined;
  const title = trimmed(value['title']);
  if (title === undefined) return undefined;
  const line = trimmed(value['line']);
  return line === undefined ? { title } : { title, line };
}

/** Pictures pair with tasks by the call's own order, before a task without a title drops out (ONL-2977). */
export function nextTasksOffered(input: unknown, result?: string): NextTasksOffer | undefined {
  const args = argumentsOf(input);
  const tasks = args?.['tasks'];
  if (!Array.isArray(tasks)) return undefined;
  const pictures = nextTaskPicturesIn(result);
  const named = tasks
    .map((value, index): NextTask | undefined => {
      const task = taskOf(value);
      const picture = pictures?.[index];
      return task === undefined || picture === undefined ? task : { ...task, picture };
    })
    .filter((task): task is NextTask => task !== undefined);
  if (named.length === 0) return undefined;
  return { tasks: named.slice(0, MAX_NEXT_TASKS) };
}

export const NEXT_TASK_SKELETONS = ['button', 'row', 'story'] as const;
export type NextTaskSkeleton = (typeof NEXT_TASK_SKELETONS)[number];

/** The agent's blocking of a task that adds something new, drawn by Studio in the skeletons' style, on a 0–100 box across and down. */
export const NEXT_TASK_SKETCH_KINDS = ['heading', 'text', 'block', 'image', 'circle', 'outline'] as const;
export type NextTaskSketchKind = (typeof NEXT_TASK_SKETCH_KINDS)[number];
export const MAX_NEXT_TASK_SKETCH_SHAPES = 12;
export const NEXT_TASK_SKETCH_BOX = 100;

/** `h` is read for block, image and outline only: a line's thickness and a circle's roundness are Studio's. */
export interface NextTaskSketchShape {
  kind: NextTaskSketchKind;
  x: number;
  y: number;
  w: number;
  h?: number;
}

export const SKETCH_KINDS_WITH_HEIGHT: readonly NextTaskSketchKind[] = ['block', 'image', 'outline'];

export type NextTaskPicture = { clip: string } | { sketch: NextTaskSketchShape[] } | { skeleton: NextTaskSkeleton };

/** The `suggest_next_tasks` result's last line: what each card shows, read back from the transcript (ONL-2977). */
export const NEXT_TASK_PICTURES_LABEL = 'Card pictures: ';

const STORED_IMAGE_ID = /^[0-9a-f]+-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function nextTaskPicturesLine(pictures: readonly (NextTaskPicture | null)[]): string {
  return `${NEXT_TASK_PICTURES_LABEL}${JSON.stringify(pictures)}`;
}

function coordinate(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? Math.round(Math.min(NEXT_TASK_SKETCH_BOX, Math.max(0, value))) : undefined;
}

function sketchShapeOf(value: unknown): NextTaskSketchShape | undefined {
  if (!isRecord(value)) return undefined;
  const kind = value['kind'];
  if (!(NEXT_TASK_SKETCH_KINDS as readonly unknown[]).includes(kind)) return undefined;
  const x = coordinate(value['x']);
  const y = coordinate(value['y']);
  const w = coordinate(value['w']);
  if (x === undefined || y === undefined || w === undefined || w === 0) return undefined;
  const shape: NextTaskSketchShape = { kind: kind as NextTaskSketchKind, x, y, w };
  if (!SKETCH_KINDS_WITH_HEIGHT.includes(shape.kind)) return shape;
  const h = coordinate(value['h']);
  return h === undefined || h === 0 ? undefined : { ...shape, h };
}

/** Untrusted on the way in, from the agent or a transcript: unknown kinds and broken shapes drop, the rest clamp to the box. */
export function nextTaskSketchOf(value: unknown): NextTaskSketchShape[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const shapes = value
    .slice(0, MAX_NEXT_TASK_SKETCH_SHAPES)
    .map(sketchShapeOf)
    .filter((shape): shape is NextTaskSketchShape => shape !== undefined);
  return shapes.length === 0 ? undefined : shapes;
}

function pictureOf(value: unknown): NextTaskPicture | undefined {
  if (!isRecord(value)) return undefined;
  const clip = value['clip'];
  if (typeof clip === 'string' && STORED_IMAGE_ID.test(clip)) return { clip };
  const sketch = nextTaskSketchOf(value['sketch']);
  if (sketch !== undefined) return { sketch };
  const skeleton = value['skeleton'];
  return (NEXT_TASK_SKELETONS as readonly unknown[]).includes(skeleton) ? { skeleton: skeleton as NextTaskSkeleton } : undefined;
}

/** One entry per task, `undefined` where the card shows text only; `undefined` overall when the result names no pictures. */
export function nextTaskPicturesIn(result: string | undefined): (NextTaskPicture | undefined)[] | undefined {
  if (result === undefined) return undefined;
  const line = result.split('\n').reverse().find((candidate) => candidate.startsWith(NEXT_TASK_PICTURES_LABEL));
  const listed = line === undefined ? undefined : parsed(line.slice(NEXT_TASK_PICTURES_LABEL.length));
  return Array.isArray(listed) ? listed.slice(0, MAX_NEXT_TASKS).map(pictureOf) : undefined;
}

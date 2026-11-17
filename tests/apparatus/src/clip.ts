import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { CHROME_TARGET, listTargets, type CdpTarget } from './cdp.js';
import { clipTimeline, parseStills, type Still } from './clip-timeline.js';

type View = 'band' | 'tab';

interface FrameEvent {
  view: View;
  /** Relative to the frames directory. */
  file: string;
  /** Compositor time, from the start of the recording. */
  atMs: number;
  cssWidth: number;
  cssHeight: number;
}

export interface ClipOptions {
  /** A still longer than this shows for this long; `Infinity` renders real time. */
  holdMs?: number;
  tailMs?: number;
  width?: number;
  gif?: boolean;
  name?: string;
  /** Where the clip and its sidecar go; the frames stay with the recording. */
  into?: string;
}

export interface StudioClip {
  path: string;
  gifPath?: string;
  /** Sidecar with every stretch: what it showed, for how long, and how long it really lasted. */
  reportPath: string;
  shownMs: number;
  realMs: number;
  changes: number;
  bytes: number;
  /** The longest unmoving stretch in the rendered clip, its closing hold excluded. */
  longestStillMs: number;
  stillsShortened: number;
}

export interface StudioRecording {
  framesDir: string;
  stop(options?: ClipOptions): Promise<StudioClip>;
}

const FRAMES_FILE = 'events.json';
const POLL_MS = 100;
const FPS = 30;
const DETECT_WIDTH = 480;
const seconds = (ms: number): string => (ms / 1000).toFixed(3);
const NO_FFMPEG =
  'Rendering a clip needs ffmpeg on PATH, and none answered. Install it (`brew install ffmpeg` on macOS); the frames are kept at';

function viewOf(target: CdpTarget): View | null {
  if (target.type !== 'page') return null;
  if (target.url.includes(CHROME_TARGET)) return 'band';
  return target.url.includes('?tab=') ? 'tab' : null;
}

/**
 * Start it before `launchStudio` on the same port to catch the first Screen; it waits for the port to answer.
 * A view sends a frame only when it repaints and a parked tab sends none, so the newest tab frame is the active tab's.
 */
export function recordStudio({ port, out }: { port: string | number; out: string }): StudioRecording {
  const framesDir = join(out, 'frames');
  for (const view of ['band', 'tab'] as const) mkdirSync(join(framesDir, view), { recursive: true });
  const startedEpochMs = Date.now();
  const events: FrameEvent[] = [];
  const sockets = new Map<string, WebSocket>();
  const lastHash = new Map<string, string>();
  let seq = 0;
  let polling = true;

  const attach = (target: CdpTarget, view: View): void => {
    const endpoint = target.webSocketDebuggerUrl;
    if (endpoint === undefined) return;
    const socket = new WebSocket(endpoint);
    sockets.set(target.id, socket);
    let id = 0;
    const send = (method: string, params: Record<string, unknown> = {}): void => {
      if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ id: ++id, method, params }));
    };
    socket.addEventListener('open', () => {
      send('Page.startScreencast', { format: 'jpeg', quality: 80, everyNthFrame: 1 });
    });
    socket.addEventListener('message', (message: MessageEvent) => {
      const frame = JSON.parse(String(message.data)) as {
        method?: string;
        params?: {
          sessionId: number;
          data: string;
          metadata: { timestamp?: number; deviceWidth: number; deviceHeight: number };
        };
      };
      if (frame.method !== 'Page.screencastFrame' || frame.params === undefined) return;
      const { sessionId, data, metadata } = frame.params;
      send('Page.screencastFrameAck', { sessionId });
      const hash = createHash('sha1').update(data).digest('hex');
      if (lastHash.get(target.id) === hash) return;
      lastHash.set(target.id, hash);
      const file = `${view}/${String(++seq).padStart(5, '0')}.jpg`;
      writeFileSync(join(framesDir, file), Buffer.from(data, 'base64'));
      const epochMs = metadata.timestamp === undefined ? Date.now() : metadata.timestamp * 1000;
      events.push({
        view,
        file,
        atMs: Math.max(0, epochMs - startedEpochMs),
        cssWidth: metadata.deviceWidth,
        cssHeight: metadata.deviceHeight,
      });
    });
  };

  const polled = (async () => {
    while (polling) {
      try {
        for (const target of await listTargets(port)) {
          const view = viewOf(target);
          if (view !== null && !sockets.has(target.id)) attach(target, view);
        }
      } catch {
        // Not listening yet, or quitting.
      }
      await new Promise((resolve) => setTimeout(resolve, POLL_MS));
    }
  })();

  return {
    framesDir,
    async stop(options = {}) {
      polling = false;
      await polled;
      for (const socket of sockets.values()) socket.close();
      const stoppedAtMs = Date.now() - startedEpochMs;
      events.sort((a, b) => a.atMs - b.atMs);
      writeFileSync(join(framesDir, FRAMES_FILE), JSON.stringify({ stoppedAtMs, events }, null, 1));
      return renderClip(out, options);
    },
  };
}

interface Composite {
  atMs: number;
  band: FrameEvent;
  tab: FrameEvent;
}

function composites(events: readonly FrameEvent[]): Composite[] {
  const out: Composite[] = [];
  let band: FrameEvent | undefined;
  let tab: FrameEvent | undefined;
  for (const event of events) {
    if (event.view === 'band') band = event;
    else tab = event;
    if (band !== undefined && tab !== undefined) out.push({ atMs: event.atMs, band, tab });
  }
  return out;
}

async function ffmpeg(args: readonly string[], cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn('ffmpeg', ['-hide_banner', '-nostdin', '-y', ...args], { cwd, stdio: ['ignore', 'ignore', 'pipe'] });
    let log = '';
    child.stderr.on('data', (chunk: Buffer) => (log += chunk.toString()));
    child.on('error', (error: NodeJS.ErrnoException) => {
      reject(error.code === 'ENOENT' ? new Error(`${NO_FFMPEG} ${cwd}.`) : error);
    });
    child.on('close', (code) => {
      if (code === 0) resolve(log);
      else reject(new Error(`ffmpeg ${args.join(' ')} exited ${String(code)}:\n${log.split('\n').slice(-15).join('\n')}`));
    });
  });
}

/** Two lists with the same durations, one per view, so `vstack` pairs the band and the tab of each moment. */
function writeLists(dir: string, shown: readonly { event: Composite; shownMs: number }[]): void {
  for (const view of ['band', 'tab'] as const) {
    const lines = ['ffconcat version 1.0'];
    // A still image's own frame rate is 25, which rounds every start onto a 40 ms grid.
    const entry = (file: string): string[] => [`file '${file}'`, 'option framerate 1000'];
    for (const { event, shownMs } of shown) lines.push(...entry(event[view].file), `duration ${seconds(shownMs)}`);
    const last = shown.at(-1);
    if (last !== undefined) lines.push(...entry(last.event[view].file));
    writeFileSync(join(dir, `${view}.ffconcat`), `${lines.join('\n')}\n`);
  }
}

function stackFilter(width: number, bandRatio: number, tail = ''): string {
  return (
    `[0:v]crop=iw:trunc(iw*${bandRatio.toFixed(5)}/2)*2:0:0,scale=${String(width)}:-2,setsar=1[b];` +
    `[1:v]scale=${String(width)}:-2,setsar=1[t];[b][t]vstack=inputs=2,fps=${String(FPS)}${tail}[v]`
  );
}

const LIST_INPUTS = ['-f', 'concat', '-safe', '0', '-i', 'band.ffconcat', '-f', 'concat', '-safe', '0', '-i', 'tab.ffconcat'];

function srtTime(ms: number): string {
  const whole = Math.round(ms);
  const pad = (n: number, w = 2): string => String(n).padStart(w, '0');
  return `${pad(Math.floor(whole / 3_600_000))}:${pad(Math.floor(whole / 60_000) % 60)}:${pad(Math.floor(whole / 1000) % 60)},${pad(whole % 1000, 3)}`;
}

function writeCaptions(dir: string, shown: readonly { shownMs: number; caption: string }[]): void {
  const cues: string[] = [];
  let at = 0;
  let open: { from: number; text: string } | undefined;
  const close = (to: number): void => {
    if (open !== undefined) cues.push(`${String(cues.length + 1)}\n${srtTime(open.from)} --> ${srtTime(to)}\n${open.text}\n`);
  };
  for (const { shownMs, caption } of shown) {
    if (open?.text !== caption) {
      close(at);
      open = { from: at, text: caption };
    }
    at += shownMs;
  }
  close(at);
  writeFileSync(join(dir, 'captions.srt'), cues.join('\n'));
}

async function stillsOf(videoArgs: readonly string[], filter: string, endMs: number, cwd: string, minMs: number): Promise<Still[]> {
  const log = await ffmpeg(
    [
      ...videoArgs,
      '-filter_complex',
      `${filter};[v]freezedetect=n=-60dB:d=${seconds(minMs)}[f]`,
      '-map',
      '[f]',
      '-t',
      seconds(endMs),
      '-f',
      'null',
      '-',
    ],
    cwd,
  );
  return parseStills(log, endMs);
}

/** Renders the frames a recording left under `out`; call it again with other options to re-cut the same recording. */
export async function renderClip(outDir: string, options: ClipOptions = {}): Promise<StudioClip> {
  const out = resolve(outDir);
  const holdMs = options.holdMs ?? 1000;
  const tailMs = options.tailMs ?? 2000;
  const width = options.width ?? 1280;
  const name = options.name ?? 'clip';
  const into = resolve(options.into ?? out);
  mkdirSync(into, { recursive: true });
  const framesDir = join(out, 'frames');
  const { stoppedAtMs, events } = JSON.parse(readFileSync(join(framesDir, FRAMES_FILE), 'utf8')) as {
    stoppedAtMs: number;
    events: FrameEvent[];
  };
  const moments = composites(events);
  const first = moments[0];
  if (first === undefined) {
    const seen = new Set(events.map((e) => e.view));
    throw new Error(
      `No moment had both the band and a tab painted (views that sent frames: ${[...seen].join(', ') || 'none'}). Was the app launched on this port while the recording ran?`,
    );
  }
  const relative = moments.map((m) => ({ ...m, atMs: m.atMs - first.atMs }));
  const realMs = stoppedAtMs - first.atMs;
  const bands = events.filter((e) => e.view === 'band');
  const bandRatio = Math.min(...bands.map((e) => e.cssHeight / e.cssWidth));

  const real = relative.map((event, i) => ({
    event,
    shownMs: (relative[i + 1]?.atMs ?? realMs) - event.atMs,
  }));
  writeLists(framesDir, real);
  const rawStills = Number.isFinite(holdMs)
    ? await stillsOf(LIST_INPUTS, stackFilter(DETECT_WIDTH, bandRatio), realMs, framesDir, holdMs)
    : [];

  const shown = clipTimeline(relative, rawStills, { holdMs, tailMs, originMs: first.atMs });
  writeLists(framesDir, shown);
  writeCaptions(framesDir, shown);
  const shownMs = shown.reduce((sum, s) => sum + s.shownMs, 0);
  const path = join(into, `${name}.mp4`);
  const captions = `,subtitles=captions.srt:force_style='FontName=Menlo,FontSize=11,Alignment=3,Outline=1,Shadow=0,MarginV=8'`;
  await ffmpeg(
    [
      ...LIST_INPUTS,
      '-filter_complex',
      stackFilter(width, bandRatio, `${captions},format=yuv420p`),
      '-map',
      '[v]',
      '-c:v',
      'libx264',
      '-preset',
      'medium',
      '-crf',
      '28',
      '-movflags',
      '+faststart',
      // The closing entry a concat list repeats carries the previous entry's duration into `fps`.
      '-t',
      seconds(shownMs),
      path,
    ],
    framesDir,
  );

  const rendered = await stillsOf(['-i', path], '[0:v]null[v]', shownMs, framesDir, 100);
  const longestStillMs = Math.round(
    Math.max(0, ...rendered.filter((s) => s.endMs < shownMs - 1000 / FPS).map((s) => s.endMs - s.startMs)),
  );

  let gifPath: string | undefined;
  if (options.gif === true) {
    gifPath = join(into, `${name}.gif`);
    await ffmpeg(
      ['-i', path, '-filter_complex', 'fps=10,scale=720:-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse', gifPath],
      framesDir,
    );
  }

  const reportPath = join(into, `${name}.json`);
  const clip: StudioClip = {
    path,
    ...(gifPath === undefined ? {} : { gifPath }),
    reportPath,
    shownMs: Math.round(shownMs),
    realMs: Math.round(realMs),
    changes: shown.length,
    bytes: statSync(path).size,
    longestStillMs,
    stillsShortened: rawStills.filter((s) => s.endMs - s.startMs > holdMs).length,
  };
  const stretches = shown.map((s) => ({ realAtMs: Math.round(first.atMs + s.event.atMs), shownMs: Math.round(s.shownMs), caption: s.caption }));
  writeFileSync(reportPath, `${JSON.stringify({ ...clip, holdMs, stillsInRealTime: rawStills, stretches }, null, 1)}\n`);
  return clip;
}

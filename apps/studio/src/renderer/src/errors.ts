import { isResizeObserverNotice, scrubException, type RendererExceptionReport } from '@studio/events';
import { rendererDoor } from './bridge.js';

type RendererKind = RendererExceptionReport['surface'];

interface ErrorEventLike {
  error?: unknown;
  message?: string;
}

interface RejectionEventLike {
  reason?: unknown;
}

export interface ErrorHookTarget {
  addEventListener(type: 'error', listener: (event: ErrorEventLike) => void): void;
  addEventListener(type: 'unhandledrejection', listener: (event: RejectionEventLike) => void): void;
}

type Sender = (report: RendererExceptionReport) => void;

function exceptionReport(
  error: unknown,
  surface: RendererKind,
  mechanism: string,
  options: { withMessage?: boolean; region?: string } = {},
): RendererExceptionReport {
  const scrubbed = scrubException(error, 'web:javascript');
  return {
    type: scrubbed.type,
    value: options.withMessage === false ? '' : scrubbed.value,
    frames: scrubbed.stacktrace?.frames ?? [],
    surface,
    mechanism,
    ...(options.region === undefined ? {} : { region: options.region }),
  };
}

function send(report: RendererExceptionReport, sender: Sender | undefined = rendererDoor()?.telemetryException): void {
  try {
    sender?.(report);
  } catch {
    // Reporting must never be the second failure.
  }
}

export function installRendererErrorHooks(surface: RendererKind, target: ErrorHookTarget = window, sender?: Sender): void {
  target.addEventListener('error', (event) => {
    if (event.error == null && isResizeObserverNotice(event.message)) return;
    send(exceptionReport(event.error ?? event.message ?? 'unknown error', surface, 'window-error'), sender);
  });
  target.addEventListener('unhandledrejection', (event) => {
    send(exceptionReport(event.reason, surface, 'unhandled-rejection'), sender);
  });
}

const NAME = String.raw`[A-Za-z_$][\w$]{0,63}`;
const DOTTED = String.raw`${NAME}(?:\.${NAME}){0,3}`;
const ENGINE_MESSAGES = [
  new RegExp(String.raw`^Cannot (?:read|set) properties of (?:null|undefined) \((?:reading|setting) '${NAME}'\)$`),
  new RegExp(String.raw`^${DOTTED} is not (?:defined|a function|a constructor|iterable)$`),
  new RegExp(String.raw`^Cannot access '${NAME}' before initialization$`),
  /^Maximum call stack size exceeded$/,
];

/** A region renders model output that can quote the user's code, so only a message the JS engine wrote around an identifier survives (ONL-2348). */
function engineMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  return ENGINE_MESSAGES.some((shape) => shape.test(message)) ? message : '';
}

export function reportBoundaryCrash(error: unknown, region: string, sender?: Sender): void {
  const surface: RendererKind = region === 'chrome' ? 'chrome' : 'tab';
  send({ ...exceptionReport(error, surface, 'react-boundary', { withMessage: false, region }), value: engineMessage(error) }, sender);
}

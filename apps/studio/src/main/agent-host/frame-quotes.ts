import { FRAME_QUOTE_MAX_LENGTH, NO_FRAME_QUOTES, asksQuestion, type CanvasDoc, type CanvasNode, type FrameQuotes, type StudioEvent } from '@studio/events';
import { projectKey, type ProjectKey } from '../project/key.js';
import { projectMap } from '../project/state.js';
import { WAITING_ON_TOOL } from './tool-names.js';
import { turnToolKind, type TurnToolKind } from './turn-tool-kinds.js';

export type FrameQuotePlacer = 'agent' | 'studio';

type QuotedNodeKind = 'frame' | 'artifact';

export type QuoteLiftTrigger = 'look' | 'turn_end' | 'page_load';

export type QuoteTarget =
  | { id: string; kind: 'frame'; homeUrl: string }
  | { id: string; kind: 'artifact'; artifactId: string };

export interface FrameQuoteBookDeps {
  emit(cwd: string, quotes: FrameQuotes): void;
  lifted(cwd: string, msToLift: number, node: QuotedNodeKind, trigger: QuoteLiftTrigger): void;
  now(): number;
  /** Off is the earlier rule: a quote lifts only on an edit made after it went up (ONL-2960). */
  liftsAtTurnEnd(): boolean;
  /** Nothing Studio draws but the quote would stand in for the frame's page. */
  showsPage(cwd: string, frameId: string): boolean;
}

type QuoteStandsFor = { kind: 'frame'; homeUrl: string } | { kind: 'artifact'; artifactId: string };

interface PlacedQuote {
  text: string;
  standsFor: QuoteStandsFor;
  placedAt: number;
  edited: boolean;
  awaitingPage: boolean;
}

/** Only a frame or an artifact shows a quote; a section, a text or a picture has nothing to stand in for (ONL-2960). */
export function quoteTargetOf(node: CanvasNode): QuoteTarget | undefined {
  if (node.kind === 'browser') return { id: node.id, kind: 'frame', homeUrl: node.content.homeUrl };
  if (node.kind === 'artifact') return { id: node.id, kind: 'artifact', artifactId: node.content.artifactId };
  return undefined;
}

const standsFor = (target: QuoteTarget): QuoteStandsFor =>
  target.kind === 'frame' ? { kind: 'frame', homeUrl: target.homeUrl } : { kind: 'artifact', artifactId: target.artifactId };

function stillStands(quote: PlacedQuote, node: CanvasNode | undefined): boolean {
  if (quote.standsFor.kind === 'frame') return node?.kind === 'browser' && node.content.homeUrl === quote.standsFor.homeUrl;
  return node?.kind === 'artifact' && node.content.artifactId === quote.standsFor.artifactId;
}

interface ProjectQuotes {
  quotes: Map<string, PlacedQuote>;
  turnRunning: boolean;
  editCalls: Set<string>;
  asking: boolean;
}

/** A canvas edit is not one: `create_frame` itself would count against the quote it places (ONL-2960). */
const FILE_EDIT_KINDS: ReadonlySet<TurnToolKind | undefined> = new Set(['file_edit', 'file_delete']);

/** A quote lives in this process only and is wiped when it lifts, is cleared, or its frame changes (ONL-2960). */
export class FrameQuoteBook {
  private readonly projects: Map<ProjectKey, ProjectQuotes>;

  constructor(private readonly deps: FrameQuoteBookDeps) {
    // Dropped when the Project's last Tab closes, so a reopened project shows no quote (ONL-2960).
    this.projects = projectMap<ProjectQuotes>('agent.frame-quotes', {
      closes: true,
      dispose: (project, key) => { if (project.quotes.size > 0) deps.emit(key, NO_FRAME_QUOTES); },
    });
  }

  view(cwd: string): FrameQuotes {
    const project = this.projects.get(projectKey(cwd));
    if (project === undefined || project.quotes.size === 0) return NO_FRAME_QUOTES;
    return {
      byFrame: Object.fromEntries([...project.quotes].map(([frameId, quote]) => [frameId, quote.text])),
      turnRunning: project.turnRunning,
    };
  }

  /** Placed inside a turn, or just before the one it starts, so the turn counts as running from here. */
  place(cwd: string, target: QuoteTarget, text: string): void {
    const project = this.project(cwd);
    project.quotes.set(target.id, { text, standsFor: standsFor(target), placedAt: this.deps.now(), edited: false, awaitingPage: false });
    project.turnRunning = true;
    this.publish(cwd);
  }

  clear(cwd: string, frameId: string): boolean {
    const project = this.projects.get(projectKey(cwd));
    if (project?.quotes.delete(frameId) !== true) return false;
    this.publish(cwd);
    return true;
  }

  observe(cwd: string, event: StudioEvent): void {
    if (event.type === 'tool.start' && FILE_EDIT_KINDS.has(turnToolKind(event.name))) {
      this.project(cwd).editCalls.add(event.toolCallId);
    }
    const project = this.projects.get(projectKey(cwd));
    if (project === undefined) return;
    switch (event.type) {
      case 'turn.started':
        project.editCalls.clear();
        project.asking = false;
        for (const quote of project.quotes.values()) quote.awaitingPage = false;
        if (!project.turnRunning && project.quotes.size > 0) {
          project.turnRunning = true;
          this.publish(cwd);
        }
        return;
      case 'tool.start':
        project.asking = event.name === WAITING_ON_TOOL || turnToolKind(event.name) === 'question';
        return;
      case 'permission.requested':
        if (asksQuestion(event.questions)) project.asking = true;
        return;
      case 'permission.resolved':
        project.asking = false;
        return;
      case 'tool.end':
        if (event.status === 'completed' && project.editCalls.has(event.toolCallId)) {
          for (const quote of project.quotes.values()) if (quote.standsFor.kind === 'frame') quote.edited = true;
        }
        return;
      case 'turn.ended': {
        project.editCalls.clear();
        const wasRunning = project.turnRunning;
        project.turnRunning = false;
        const lifted = this.deps.liftsAtTurnEnd() ? this.liftedAtTurnEnd(cwd, project) : this.editedSincePlaced(project);
        project.asking = false;
        if (lifted.length > 0) this.lift(cwd, project, lifted, 'turn_end');
        else if (wasRunning && project.quotes.size > 0) this.publish(cwd);
        return;
      }
      default:
        return;
    }
  }

  guestLoaded(cwd: string, frameId: string): void {
    const project = this.projects.get(projectKey(cwd));
    const quote = project?.quotes.get(frameId);
    if (project === undefined || quote === undefined) return;
    const lifts = this.deps.liftsAtTurnEnd() ? quote.awaitingPage : quote.edited;
    if (lifts) this.lift(cwd, project, [frameId], 'page_load');
  }

  /** What the agent's capture showed it, the user now sees too; a frame whose page is not showing keeps its quote (ONL-2960). */
  looked(cwd: string, frameId: string): void {
    if (!this.deps.liftsAtTurnEnd()) return;
    const project = this.projects.get(projectKey(cwd));
    const quote = project?.quotes.get(frameId);
    if (project === undefined || quote === undefined) return;
    if (quote.standsFor.kind === 'frame' && !this.deps.showsPage(cwd, frameId)) return;
    this.lift(cwd, project, [frameId], 'look');
  }

  artifactWritten(cwd: string, artifactId: string): void {
    const project = this.projects.get(projectKey(cwd));
    if (project === undefined) return;
    for (const quote of project.quotes.values()) {
      if (quote.standsFor.kind === 'artifact' && quote.standsFor.artifactId === artifactId) quote.edited = true;
    }
  }

  /** A node removed, aimed at another address, or showing another artifact takes its quote with it. */
  documentChanged(cwd: string, doc: CanvasDoc): void {
    const project = this.projects.get(projectKey(cwd));
    if (project === undefined) return;
    const orphaned = [...project.quotes].filter(([nodeId, quote]) => !stillStands(quote, doc.nodes[nodeId]));
    if (orphaned.length === 0) return;
    for (const [frameId] of orphaned) project.quotes.delete(frameId);
    this.publish(cwd);
  }

  /** The project closed or its chat was replaced: no quote outlives the moment that placed it. */
  forget(cwd: string): void {
    const key = projectKey(cwd);
    const project = this.projects.get(key);
    if (project === undefined) return;
    this.projects.delete(key);
    if (project.quotes.size > 0) this.deps.emit(cwd, NO_FRAME_QUOTES);
  }

  /** A turn that ends on a question for the user keeps every quote; an artifact's lifts with the turn, a frame whose page is not showing yet on its next load. */
  private liftedAtTurnEnd(cwd: string, project: ProjectQuotes): string[] {
    if (project.asking) return [];
    const lifted: string[] = [];
    for (const [frameId, quote] of project.quotes) {
      if (quote.standsFor.kind === 'artifact' || this.deps.showsPage(cwd, frameId)) lifted.push(frameId);
      else quote.awaitingPage = true;
    }
    return lifted;
  }

  private editedSincePlaced(project: ProjectQuotes): string[] {
    return [...project.quotes].filter(([, quote]) => quote.edited).map(([frameId]) => frameId);
  }

  private lift(cwd: string, project: ProjectQuotes, frameIds: readonly string[], trigger: QuoteLiftTrigger): void {
    const now = this.deps.now();
    for (const frameId of frameIds) {
      const quote = project.quotes.get(frameId);
      if (quote === undefined) continue;
      project.quotes.delete(frameId);
      this.deps.lifted(cwd, Math.max(0, Math.round(now - quote.placedAt)), quote.standsFor.kind, trigger);
    }
    this.publish(cwd);
  }

  private project(cwd: string): ProjectQuotes {
    const key = projectKey(cwd);
    let project = this.projects.get(key);
    if (project === undefined) {
      project = { quotes: new Map(), turnRunning: false, editCalls: new Set(), asking: false };
      this.projects.set(key, project);
    }
    return project;
  }

  private publish(cwd: string): void {
    this.deps.emit(cwd, this.view(cwd));
  }
}

export interface StudioQuoteConditions {
  isOn: boolean;
  isBlank: boolean;
  starterPort: number | undefined;
  quote: string | undefined;
}

/** Studio places a quoted frame only for its own onboarding prompt on a blank project whose starter runs (ONL-2960). */
export function studioQuotePlacement(conditions: StudioQuoteConditions): { port: number; quote: string } | undefined {
  const quote = typeof conditions.quote === 'string' ? conditions.quote.trim() : undefined;
  if (quote === undefined || quote === '' || quote.length > FRAME_QUOTE_MAX_LENGTH) return undefined;
  if (!conditions.isOn || !conditions.isBlank || conditions.starterPort === undefined) return undefined;
  return { port: conditions.starterPort, quote };
}

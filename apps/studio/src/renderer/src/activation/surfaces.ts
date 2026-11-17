import type { ActivationSurfaceReport } from '@studio/events';
import type { Screen } from './advance.js';

export function screenSurface(screen: Screen['kind']): ActivationSurfaceReport['surface'] | undefined {
  switch (screen) {
    case 'projects': return 'project_picker';
    case 'editor': return 'chat_idle';
    case 'onboarding': return 'setup';
    default: return undefined;
  }
}

export type SurfaceLayer = 'screen' | 'canvas' | 'setup';

export class SurfaceReporter {
  private readonly layers = new Map<SurfaceLayer, { owner: symbol | undefined; report: ActivationSurfaceReport }>();
  private previous = '';

  constructor(private readonly send: (report: ActivationSurfaceReport) => void) {}

  set(layer: SurfaceLayer, report: ActivationSurfaceReport, owner?: symbol): void {
    this.layers.set(layer, { owner, report });
    this.publish();
  }

  remove(layer: SurfaceLayer, owner?: symbol): void {
    if (this.layers.get(layer)?.owner !== owner) return;
    this.layers.delete(layer);
    this.publish();
  }

  private publish(): void {
    const report = (this.layers.get('setup') ?? this.layers.get('canvas') ?? this.layers.get('screen'))?.report;
    const key = JSON.stringify(report);
    if (report === undefined || key === this.previous) return;
    this.previous = key;
    this.send(report);
  }
}

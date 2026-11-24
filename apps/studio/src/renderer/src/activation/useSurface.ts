import { useEffect, useRef } from 'react';
import type { ActivationDeadEnd, ActivationSurface, ActivationSurfaceReport } from '@studio/events';
import { sendTelemetry } from '../canvas/telemetry.js';
import { SurfaceReporter, type SurfaceLayer } from './surfaces.js';

const reporter = new SurfaceReporter((properties) => sendTelemetry({ event: 'activation_surface', properties }));

export function useSurface(layer: SurfaceLayer, surface: ActivationSurface | undefined, state?: ActivationDeadEnd, options: Partial<Omit<NonNullable<ActivationSurfaceReport['dead_end']>, 'state'>> = {}): void {
  const { error_class: errorClass = 'unknown', cover, server_port: serverPort, harness } = options;
  const generation = useRef(0);
  const owner = useRef(Symbol(layer));
  useEffect(() => {
    if (surface === undefined) reporter.remove(layer, owner.current);
    else reporter.set(layer, { surface, ...(state === undefined ? {} : { dead_end: { state, error_class: errorClass, ...(cover === undefined ? {} : { cover }), ...(serverPort === undefined ? {} : { server_port: serverPort }), ...(harness === undefined ? {} : { harness }) } }) }, owner.current);
  }, [layer, surface, state, errorClass, cover, serverPort, harness]);
  useEffect(() => {
    const mounted = ++generation.current;
    return () => {
      queueMicrotask(() => {
        if (generation.current === mounted) reporter.remove(layer, owner.current);
      });
    };
  }, [layer]);
}

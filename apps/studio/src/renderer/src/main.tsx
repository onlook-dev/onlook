import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { DIAGNOSTICS_HASH } from '@studio/events';
import { installDebugBridge } from './diagnostics/bridge.js';
import type { ChatFixtureScenario } from './dev/ChatFixture.js';
import type { OnboardingScenario } from './dev/OnboardingPreview.js';
import { installRendererErrorHooks } from './errors.js';
import { log } from './log.js';
import { registerStudioIcons } from './icons/registry.js';
import { trackInputModality } from './inputModality.js';
import { trackTooltipWarmth } from './tooltipWarmth.js';
import { initPerfTelemetry } from './perf/index.js';
import { initReplay } from './replay/index.js';
import { Root } from './Root.js';
import { capable } from './capabilities.js';
import { CloudCompatibility } from './cloud/UpdateRequired.js';
import { installTabFrames } from './canvas/frame/tabFrames.js';
import { htmlLang } from '@studio/i18n';
import { AstryxLanguage } from './AstryxLanguage.js';
import { LayerProvider } from '@astryxdesign/core/Layer';
import { TOAST_LANE } from './notifications/lane.js';
import { studio } from './bridge.js';

// Module scope, not React context: this has to run before the first render.
installRendererErrorHooks('tab');
document.documentElement.lang = htmlLang();
registerStudioIcons();
trackInputModality();
trackTooltipWarmth();
installTabFrames();
// Two frames after the tab is shown again, it has drawn at its current widths; main then drops the view covering it (ONL-2744).
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  requestAnimationFrame(() => requestAnimationFrame(() => studio().tabPresented()));
});
log('renderer').info('tab view mounted');

const container = document.getElementById('root');
if (!container) throw new Error('#root missing from index.html');

// Hashes main appends behind their gates (`main/index.ts`, `main/diagnostics/gate.ts`); not routing. `#onboarding` is a still life, the first-run gate is `<Root/>`.
const hash = window.location.hash;
const isProjects = hash === '#projects' || hash.startsWith('#projects:');
const isShowroom = hash.startsWith('#showroom');
const showroomTarget = isShowroom ? hash.slice('#showroom'.length).replace(/^:/, '') || undefined : undefined;
const isDiagnostics = hash === '#diagnostics';
// Before the first render: the surfaces register their actions as they mount.
if (hash === DIAGNOSTICS_HASH) installDebugBridge();
const chatFixture = hash.startsWith('#chat-fixture')
  ? ((hash.split(':')[1] ?? 'long') as ChatFixtureScenario)
  : undefined;
const onboarding = hash.startsWith('#onboarding')
  ? ((hash.slice('#onboarding'.length).replace(/^:/, '') || 'agents') as OnboardingScenario)
  : undefined;

// A developer instrument is not a user session and never records; module scope so StrictMode cannot double-init, not awaited so replay never gates first paint.
if (!chatFixture && !onboarding && !isProjects && !isShowroom && !isDiagnostics) {
  void initReplay();
  void initPerfTelemetry();
}

// Each instrument is its own chunk, fetched only behind its hash, so the tab bundle carries none of `dev/`.
async function loadInstrument(): Promise<React.JSX.Element | undefined> {
  if (chatFixture) {
    const { ChatFixture } = await import('./dev/ChatFixture.js');
    return <ChatFixture scenario={chatFixture} />;
  }
  if (onboarding) {
    const { OnboardingPreview } = await import('./dev/OnboardingPreview.js');
    return <OnboardingPreview scenario={onboarding} />;
  }
  if (isProjects) {
    const { ProjectsShowroom } = await import('./dev/ProjectsShowroom.js');
    return <ProjectsShowroom scenario={hash.slice('#projects:'.length)} />;
  }
  if (isShowroom) {
    const [{ Showroom }, { GALLERIES }] = await Promise.all([
      import('./dev/showroom/Showroom.js'),
      import('./dev/showroom/registry.js'),
    ]);
    return <Showroom galleries={GALLERIES} initial={showroomTarget} />;
  }
  if (isDiagnostics) {
    const { Diagnostics } = await import('./dev/Diagnostics.js');
    return <Diagnostics />;
  }
  return undefined;
}

// Inter's faces use font-display: swap, so a first paint before it loads draws the fallback and then jumps (ONL-2593).
// Bounded: a face that never loads must not hold the window blank.
const FONT_WAIT_MS = 400;
const fontsReady = Promise.race([
  document.fonts.load('16px "Inter Variable"').catch(() => undefined),
  new Promise((resolve) => setTimeout(resolve, FONT_WAIT_MS)),
]);
void Promise.all([loadInstrument(), fontsReady]).then(([instrument]) => {
  createRoot(container).render(
    <StrictMode>
      <AstryxLanguage>
        <LayerProvider toast={TOAST_LANE}>
        {instrument ?? (
          capable('account') ? <CloudCompatibility><Root /></CloudCompatibility> : <Root />
        )}
        </LayerProvider>
      </AstryxLanguage>
    </StrictMode>,
  );
});

/* A developer instrument bypasses `Root`, so it reports `uiReady` here or its window waits out main's backstop. */
const isDevInstrument =
  chatFixture !== undefined ||
  onboarding !== undefined ||
  isProjects ||
  isShowroom ||
  isDiagnostics;
if (isDevInstrument) studio().uiReady();

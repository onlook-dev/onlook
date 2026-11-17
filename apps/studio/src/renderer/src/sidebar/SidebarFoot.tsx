import { useEffect, useRef } from 'react';
import { observeResize, unobserveResize } from '@astryxdesign/core/utils';

import { AgentStatusFoot } from '../agentStatus/AgentStatusFoot.js';
import { isChromeHidden, isRailHidden, useCanvasStore } from '../canvas/store.js';
import { tipsPillVisible } from '../canvas/cornerPlacement.js';
import { useToastFootClaim } from '../notifications/foot.js';
import { InviteTipFoot } from '../notifications/InviteTip.js';
import { footGrowth, footTipShown, holdTip, spendTip, TIP_DONE_LINGER_MS, tipClaim, useFootHoldsPill, useFootSeat, type FootSeat } from './footSeat.js';
import { restartTipBeat, setLeftPanelFootPx, startTipBeat, TIP_BEAT_MS, TIP_OPENING_BEAT_MS } from './footStore.js';
import { TipGrowth } from './TipGrowth.js';
import { InspireTipFoot } from './InspireTip.js';
import { FOOT_EDGE_GAP } from '../panels/rowGeometry.js';
import { PromptTipFoot } from './PromptTip.js';
import { PROMPT_TIP_DELAY_MS, watchNextTasksOffer } from './promptTipStore.js';
import { ScrollTipFoot } from './ScrollTip.js';
import { lingerScrollTip } from './scrollTipStore.js';
import { resolveTip } from './resolveTip.js';
import { useScrollKeyStore } from '../canvas/frame/scrollKey.js';
import { SetupStepBar } from './SetupStepBar.js';
import { useLeftPanelView } from '../rail/useLeftPanelView.js';
import { claimTipMoment, useTipMomentStore } from '../tips/moment.js';
import { subscribeToOnScreen } from '../tips/onScreen.js';

export function SidebarFoot(): React.JSX.Element | null {
  const view = useFootSeat();
  useEffect(() => subscribeToOnScreen(), []);
  const { isPromptWaiting } = view;
  useEffect(() => watchNextTasksOffer(view.path, isPromptWaiting, PROMPT_TIP_DELAY_MS), [view.path, isPromptWaiting]);
  const { foot, path, phase, hasStatusLines } = view;

  useEffect(() => {
    if (path === null) return;
    return useScrollKeyStore.subscribe((state, before) => {
      if (state.pageKeyScrolls !== before.pageKeyScrolls) lingerScrollTip(path, TIP_DONE_LINGER_MS, () => resolveTip(path, { tip: 'scroll', reason: 'used' }));
    });
  }, [path]);

  const { isFootOn, resolution } = view;
  useEffect(() => {
    if (path !== null && holdTip(path, foot.tip) && isFootOn) restartTipBeat(path, TIP_BEAT_MS);
  }, [path, foot.tip, isFootOn]);
  const resolvedTip = resolution?.tip ?? null;
  const resolvedReason = resolution?.reason ?? null;
  useEffect(() => {
    if (path !== null && resolvedTip !== null && resolvedReason !== null) resolveTip(path, { tip: resolvedTip, reason: resolvedReason });
  }, [path, resolvedTip, resolvedReason]);
  const { isInspirePreempted } = view;
  useEffect(() => {
    if (path !== null && isInspirePreempted) spendTip(path);
  }, [path, isInspirePreempted]);

  const momentOpenedAt = useTipMomentStore((state) => (path === null ? undefined : state.moments[path]?.openedAt));
  const isLeftPanelHidden = useCanvasStore((state) => isRailHidden(state, 'left'));
  const leftPanelView = useLeftPanelView();
  const shownTip = foot.tip !== null && footTipShown(foot.tip, { tip: foot.tip, isLeftPanelHidden, leftPanelView }) ? foot.tip : null;
  useEffect(() => {
    if (path !== null && shownTip !== null) claimTipMoment(path, tipClaim(shownTip));
  }, [path, shownTip, momentOpenedAt]);

  useEffect(() => {
    if (isFootOn && path !== null) startTipBeat(path, TIP_OPENING_BEAT_MS);
  }, [isFootOn, path, momentOpenedAt]);
  const holdsPill = useFootHoldsPill();
  const chromeHidden = useCanvasStore(isChromeHidden);
  const isInteract = useCanvasStore((state) => state.mode === 'interact');
  const isPillShown = holdsPill && tipsPillVisible({ chromeHidden, isInteract, isInspireTipShown: false });
  const growth = footGrowth(foot, { isFootOn, isPillShown });

  const card = (path === null ? null : foot.tip === 'scroll' ? <ScrollTipFoot path={path} /> : foot.tip === 'prompt' ? <PromptTipFoot path={path} /> : null);
  const tipCard = foot.tip === 'invite' ? <InviteTipFoot /> : foot.tip === 'inspire' && path !== null ? <InspireTipFoot path={path} phase={phase} /> : card;
  const tip = growth === null ? tipCard : <TipGrowth growth={growth} tip={tipCard} isTipFolding={foot.tip === 'inspire' && phase === 'leaving'} />;
  const seat = <Seat seat={foot.seat} />;
  if (tip === null && foot.seat === null) return null;
  const isSeatDrawn = foot.seat?.kind === 'setup' || (foot.seat?.kind === 'agent-status' && hasStatusLines);
  return (
    <MeasuredFoot isOnEdge={tip !== null && !isSeatDrawn}>
      {tip}
      {seat}
    </MeasuredFoot>
  );
}

function Seat({ seat }: { seat: FootSeat }): React.JSX.Element | null {
  if (seat?.kind === 'setup') return <SetupStepBar progress={seat.progress} />;
  if (seat?.kind === 'agent-status') return <AgentStatusFoot />;
  return null;
}

function MeasuredFoot({ isOnEdge = false, children }: { isOnEdge?: boolean; children: React.ReactNode }): React.JSX.Element {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    observeResize(el, () => {
      setLeftPanelFootPx(Math.round(el.getBoundingClientRect().height));
    });
    return () => {
      unobserveResize(el);
      setLeftPanelFootPx(0);
    };
  }, []);
  /* Not a second `observeResize`: Astryx's keys one callback per element, so it would drop the measurement above (ONL-2650). */
  const claimFoot = useToastFootClaim();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return claimFoot(el);
  }, [claimFoot]);
  return <div ref={ref} style={{ flexShrink: 0, ...(isOnEdge ? { paddingBlockEnd: FOOT_EDGE_GAP } : {}) }}>{children}</div>;
}

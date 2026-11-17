import type { ArtifactPageState } from '@studio/events';

export function requestLivePageState(read: () => Promise<ArtifactPageState>, settle: (state: ArtifactPageState) => void, deadlineMs = 8000) {
  let active = true;
  const timer = setTimeout(() => {
    active = false;
    settle({outcome: 'unavailable'});
  }, deadlineMs);
  const answer = (state: ArtifactPageState): void => {
    if (!active) return;
    if (state.outcome !== 'ready') clearTimeout(timer);
    settle(state);
  };
  void Promise.resolve().then(read).then(answer).catch(() => answer({outcome: 'unavailable'}));
  return { timer, cancel: () => { active = false; clearTimeout(timer); } };
}

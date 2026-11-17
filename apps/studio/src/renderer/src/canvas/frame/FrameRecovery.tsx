import { useRef, useState } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { Icon } from '@astryxdesign/core/Icon';
import { VStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { canSubmitPrompt, useAgentStore } from '../../agent/store.js';
import { submitChatPrompt } from '../../chat/submitRegistry.js';
import { t } from '@studio/i18n';
import { WindowGlyph } from '../../icons/glyphs.js';
import { useCanvasStore } from '../store.js';
import { useServerStore } from '../../server/store.js';
import { closeExportPanel } from '../artifact/exportPanelState.js';
import { studio } from '../../bridge.js';
import './frame.css';

/** The cover's ask: the frame goes along selected, and the chat opens to show it land. */
export interface RecoveryAskRequest {
  text: string;
  context?: string;
}

export function useRecoveryAsk(frameId: string): { ask: (request: RecoveryAskRequest) => void; sending: boolean; failed: boolean } {
  const inFlight = useRef(false);
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);

  const send = async (request: RecoveryAskRequest): Promise<void> => {
    if (inFlight.current) return;
    inFlight.current = true;
    setSending(true);
    setFailed(false);
    closeExportPanel();
    useCanvasStore.setState((state) => ({
      hiddenRails: { ...state.hiddenRails, right: false },
      previewRails: { ...state.previewRails, right: true },
      chromeHidden: false,
    }));
    studio().telemetryEvent({ event: 'preview_recovery_pressed', properties: { action: 'ask-agent' } });
    try {
      const result = await submitChatPrompt({
        text: request.text,
        ...(request.context === undefined ? {} : { context: request.context }),
        frames: { selectedFrameIds: [frameId], frameName: (id) => useCanvasStore.getState().doc?.nodes[id]?.name },
        elementSelections: [],
        images: [],
        skills: [],
        artifacts: [],
      });
      setFailed(result.outcome !== 'accepted');
    } catch {
      setFailed(true);
    } finally {
      inFlight.current = false;
      setSending(false);
    }
  };

  return { ask: (request) => { void send(request); }, sending, failed };
}

export function FrameRecovery({ frameId, url, detail, onRestart, scale = 1 }: {
  frameId: string;
  url: string;
  detail: string;
  onRestart: () => void;
  scale?: number;
}): React.JSX.Element {
  const canAsk = useAgentStore(canSubmitPrompt);
  const restarting = useServerStore((state) => state.pending);
  const { ask, sending, failed } = useRecoveryAsk(frameId);

  return <FrameRecoverySurface detail={detail} scale={scale} canAsk={canAsk} sending={sending} restarting={restarting} failed={failed} onAsk={() => ask({ text: t('frame.recovery.prompt', { url, reason: detail }) })} onRestart={() => {
    studio().telemetryEvent({ event: 'preview_recovery_pressed', properties: { action: 'restart' } });
    onRestart();
  }} />;
}

export function FrameRecoverySurface({ detail, scale = 1, canAsk = true, sending = false, restarting = false, failed = false, onAsk, onRestart }: {
  detail: string;
  scale?: number;
  canAsk?: boolean;
  sending?: boolean;
  restarting?: boolean;
  failed?: boolean;
  onAsk: () => void;
  onRestart: () => void;
}): React.JSX.Element {
  return (
    <div className="frame-failure-cover" style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }} data-testid="frame-recovery">
      <div className="frame-failure" style={{ width: `${String(100 / scale)}%`, height: `${String(100 / scale)}%`, transform: `scale(${String(scale)})` }}>
        <VStack gap={3} align="center" className="frame-failure-card">
          <span className="frame-failure-glyph"><Icon icon={WindowGlyph} /></span>
          <Text type="label" justify="center" className="frame-failure-title">{t('frame.health.failed.title')}</Text>
          <Text type="supporting" color="secondary" justify="center" className="frame-failure-detail">{detail}</Text>
          <VStack gap={2} align="center" className="frame-failure-action nodrag nopan" style={{ pointerEvents: 'auto' }} onClick={(event) => event.stopPropagation()}>
            <Button size="sm" label={t('frame.recovery.ask')} isDisabled={!canAsk || sending} onClick={onAsk} />
            <Button size="sm" variant="secondary" label={t(restarting ? 'canvas.run.starting' : 'frame.recovery.restart')} isDisabled={restarting} onClick={onRestart} />
          </VStack>
          {(failed || !canAsk) && <Text type="supporting" color="secondary" justify="center" role="alert">{t(failed ? 'frame.recovery.sendFailed' : 'frame.recovery.agentUnavailable')}</Text>}
        </VStack>
      </div>
    </div>
  );
}

import { useMemo } from 'react';
import { TouchedFiles } from '@studio/chat-ui';
import type { TouchedFileView } from '@studio/events';
import { useFlag } from '../flags/store.js';
import { ForwardIcon } from '../icons/glyphs.js';
import { TouchedFilePreview } from './TouchedFilePreview.js';
import { touchedFileStrings } from './touchedFileStrings.js';
import { useTouchedFilePreview } from './useTouchedFilePreview.js';
import { studio } from '../bridge.js';

export function TouchedFilesCard({ files, isStreaming, scope, turnId }: { files: readonly TouchedFileView[]; isStreaming: boolean; scope: string | undefined; turnId?: string | undefined }): React.JSX.Element | null {
  const enabled = useFlag('touchedFiles');
  const preview = useTouchedFilePreview(enabled ? scope : undefined);
  const strings = useMemo(touchedFileStrings, []);
  if (!enabled) return null;
  return <>
    <TouchedFiles key={turnId ?? 'stored'} files={files} isStreaming={isStreaming} strings={strings} chevronIcon={ForwardIcon} onOpen={(path) => {
      studio().telemetryEvent({ event: 'touched_file_opened', properties: { during_turn: isStreaming } });
      preview.open(path);
    }} />
    <TouchedFilePreview path={preview.path} result={preview.result} onClose={preview.close} />
  </>;
}

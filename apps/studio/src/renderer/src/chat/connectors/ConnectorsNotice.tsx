import { useLayoutEffect, useRef, useState } from 'react';
import { Icon } from '@astryxdesign/core/Icon';
import { IconButton } from '@astryxdesign/core/IconButton';
import { t } from '@studio/i18n';
import { CloseSmallIcon } from '../../icons/glyphs.js';
import { ConnectorMark } from './marks.js';
import './connectors.css';

export function ConnectorsNotice({ onOpen, onDismiss }: { onOpen: () => void; onDismiss: () => void }): React.JSX.Element {
  const line = useRef<HTMLSpanElement>(null);
  const [short, setShort] = useState(false);
  useLayoutEffect(() => {
    const element = line.current;
    if (element === null) return;
    const measure = document.createElement('canvas').getContext('2d');
    if (measure === null) return;
    const fit = (): void => {
      const style = getComputedStyle(element);
      measure.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      setShort(measure.measureText(t('chat.connectors.notice.lineFull')).width > element.clientWidth);
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(element);
    let live = true;
    void document.fonts.ready.then(() => { if (live) fit(); });
    return () => { live = false; observer.disconnect(); };
  }, []);
  return (
    <div style={{ position: 'relative', width: '100%' }} data-testid="chat-connectors-notice">
      <button type="button" className="chat-connectors-notice-action" onClick={onOpen}>
        <ConnectorMark which="figma" />
        <span style={{ display: 'flex', minWidth: 0, flex: 1, flexDirection: 'column' }}>
          <span style={{ color: 'var(--color-on-dark)', fontSize: 'var(--text-body-size)', lineHeight: 'var(--text-body-leading)' }}>{t('chat.connectors.notice.title')}</span>
          <span ref={line} data-testid="chat-connectors-notice-line" style={{ color: 'var(--color-text-gray)', fontSize: 'var(--text-supporting-size)', lineHeight: 'var(--text-supporting-leading)' }}>{short ? t('chat.connectors.notice.lineShort') : t('chat.connectors.notice.lineFull')}</span>
        </span>
      </button>
      <IconButton label={t('chat.connectors.notice.dismiss')} icon={<Icon icon={CloseSmallIcon} size="sm" color="inherit" />} variant="ghost" size="sm" onClick={onDismiss} style={{ position: 'absolute', top: '50%', right: 6, transform: 'translateY(-50%)' }} />
    </div>
  );
}

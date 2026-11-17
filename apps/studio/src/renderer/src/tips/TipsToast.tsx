import { t } from '@studio/i18n';
import { REGION } from '../layout.js';
import { clearTipsToast, useTipsStore } from './store.js';
import { TIPS_HREF, TIPS_RULES } from './styles.js';

/** Slides out from under the frosted mode band and back under it, so it never covers the toolbar. */
export function TipsToast(): React.JSX.Element | null {
  const toast = useTipsStore((s) => s.toast);
  if (toast === null) return null;
  return (
    <output className="tips-toast-lane" style={{ height: REGION.modeBand + 72 }} data-testid="tips-toast">
      <style href={TIPS_HREF} precedence="medium">
        {TIPS_RULES}
      </style>
      <div key={toast.nonce} className="tips-toast" style={{ marginTop: REGION.modeBand + 10 }} onAnimationEnd={clearTipsToast}>
        {t('tips.added', { prompt: toast.prompt })}
      </div>
    </output>
  );
}

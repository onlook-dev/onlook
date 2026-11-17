import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Dialog } from '../overlay/Dialog.js';
import { Button } from '@astryxdesign/core/Button';
import { t, type StringKey } from '@studio/i18n';
import { isPanning, panTo, shotTransform, type Shot } from './camera.js';
import { SCENE_HREF, SCENE_RULES, TourScene, type TourStep } from './TourScene.js';
import { LAYER } from '../overlay/layers.js';

const STEPS: readonly { id: TourStep; title: StringKey; body: StringKey; shot: Shot }[] = [
  { id: 'canvas', title: 'tour.canvas.title', body: 'tour.canvas.body', shot: { x: -240, y: -50, width: 2000 } },
  { id: 'chat', title: 'tour.chat.title', body: 'tour.chat.body', shot: { x: 920, y: 620, width: 600 } },
  { id: 'variations', title: 'tour.variations.title', body: 'tour.variations.body', shot: { x: 92, y: 122, width: 1300 } },
  { id: 'layouts', title: 'tour.layouts.title', body: 'tour.layouts.body', shot: { x: 412, y: 488, width: 660 } },
  { id: 'riff', title: 'tour.riff.title', body: 'tour.riff.body', shot: { x: 450, y: 344, width: 440 } },
  { id: 'carousels', title: 'tour.carousels.title', body: 'tour.carousels.body', shot: { x: 560, y: 262, width: 760 } },
  { id: 'wrap', title: 'tour.wrap.title', body: 'tour.wrap.body', shot: { x: -240, y: -50, width: 2000 } },
];

const VIEW_WIDTH = 520;
const CLOSEST = STEPS.reduce((a, b) => (b.shot.width < a.shot.width ? b : a)).shot;

const TOUR_HREF = 'studio-tour';
const TOUR_RULES = `
/* The tour draws its own hairline over the picture and the text alike, so the dialog's inset ring is dropped to avoid a double edge. */
dialog:has(.tour){overflow:hidden;overscroll-behavior:none;box-shadow:0 8px 20px color(display-p3 0 0 0 / .5)!important}
.tour{position:relative;display:flex;flex-direction:column;user-select:none;-webkit-user-select:none;cursor:default}
.tour:after{content:"";position:absolute;inset:0;z-index:${LAYER.over};border-radius:8px;box-shadow:inset 0 0 0 .5px color(display-p3 1 1 1 / 0.09);pointer-events:none}
.tour-stage{--tour-select:color(display-p3 0.3181 0.542 0.9687);position:relative;height:312px;overflow:hidden;border-radius:8px 8px 0 0;background:color(display-p3 0.0549 0.0549 0.0621)}
.tour-copy{min-height:108px;box-sizing:border-box;padding:24px 24px 0;overflow:hidden}
.tour-title{text-wrap:balance;margin:0;font-size:var(--font-size-2xl);font-weight:var(--font-weight-normal);letter-spacing:-.01em;line-height:1.3;color:var(--color-text-primary)}
.tour-body{text-wrap:balance;margin:6px 0 0;color:var(--color-text-secondary)}
.tour-foot{display:flex;align-items:center;justify-content:space-between;padding:16px 24px 24px}
.tour-dots{display:flex;gap:6px}
.tour-dots i{width:6px;height:6px;border-radius:3px;background:color(display-p3 1 1 1 / .2)}
.tour-dots i[data-on]{width:16px;background:var(--color-text-primary)}
.tour-actions{display:flex;gap:8px;align-items:center}
`;

export interface TourDialogProps {
  isOpen: boolean;
  /** `completed` only when Start on the last step closed it. */
  onClose: (closed: { step: TourStep; completed: boolean }) => void;
}

export function TourDialog({ isOpen, onClose }: TourDialogProps): React.JSX.Element {
  const [index, setIndex] = useState(0);
  const previous = useRef(0);
  const scene = useRef<HTMLDivElement>(null);
  const step = STEPS[index] ?? STEPS[0]!;
  const isLast = index === STEPS.length - 1;

  useLayoutEffect(() => {
    const el = scene.current;
    if (!el) return;
    const target = shotTransform(step.shot, VIEW_WIDTH);
    if (el.style.transform !== '') {
      panTo(el, target);
      return;
    }
    // A will-change layer keeps the scale it was first painted at, so paint it once at the tour's closest shot; every pan after that is a GPU scale, never a re-raster.
    el.style.willChange = 'transform';
    el.style.opacity = '0.01';
    el.style.transform = shotTransform(CLOSEST, VIEW_WIDTH);
    let id = requestAnimationFrame(() => {
      id = requestAnimationFrame(() => {
        el.style.transform = target;
        el.style.opacity = '';
      });
    });
    return () => {
      cancelAnimationFrame(id);
      el.style.opacity = '';
    };
  }, [step]);

  const sending = useRef<number | undefined>(undefined);
  const cancelSend = (): void => {
    window.clearTimeout(sending.current);
    sending.current = undefined;
    scene.current?.removeAttribute('data-send');
  };
  useEffect(() => cancelSend, []);

  const go = (next: number): void => {
    cancelSend();
    previous.current = index;
    setIndex(next);
  };

  // The click step sends its inline chat before the camera moves on.
  const send = (): void => {
    const el = scene.current;
    if (!el || sending.current !== undefined) return;
    const target = index + 1;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      go(target);
      return;
    }
    el.setAttribute('data-send', '');
    sending.current = window.setTimeout(() => {
      go(target);
    }, 340);
  };

  // A press on the picture mid-pan goes back to where the pan began, once.
  const interrupt = (): void => {
    const el = scene.current;
    if (!el || sending.current !== undefined || !isPanning(el)) return;
    const back = previous.current;
    previous.current = index;
    cancelSend();
    setIndex(back);
  };

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose({ step: step.id, completed: false });
      }}
      width="520px"
      padding={0}
      aria-label={t('tour.label')}
      data-testid="tour-dialog"
    >
      <style href={TOUR_HREF} precedence="medium">
        {TOUR_RULES}
      </style>
      <style href={SCENE_HREF} precedence="medium">
        {SCENE_RULES}
      </style>
      <div className="tour">
        <div className="tour-stage" onPointerDown={interrupt}>
          <TourScene ref={scene} step={step.id} />
        </div>
        <div className="tour-copy">
          <h2 className="tour-title">{t(step.title)}</h2>
          <p className="tour-body">{t(step.body)}</p>
        </div>
        <div className="tour-foot">
          <div className="tour-dots" aria-hidden="true">
            {STEPS.map((s, i) => (
              <i key={s.id} data-on={i === index ? '' : undefined} />
            ))}
          </div>
          <div className="tour-actions">
            {index === 0 ? (
              <Button
                size="sm"
                variant="ghost"
                label={t('tour.skip')}
                data-testid="tour-skip"
                onClick={() => {
                  onClose({ step: step.id, completed: false });
                }}
              />
            ) : (
              <Button
                size="sm"
                variant="secondary"
                label={t('tour.back')}
                onClick={() => {
                  go(index - 1);
                }}
              />
            )}
            <Button
              size="sm"
              variant="primary"
              label={isLast ? t('tour.done') : t('tour.next')}
              onClick={() => {
                if (isLast) onClose({ step: step.id, completed: true });
                else if (step.id === 'riff') send();
                else go(index + 1);
              }}
            />
          </div>
        </div>
      </div>
    </Dialog>
  );
}

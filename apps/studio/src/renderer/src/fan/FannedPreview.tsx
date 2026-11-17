import { useEffect, useRef, useState } from 'react';
import { Icon } from '@astryxdesign/core/Icon';
import { IconButton } from '@astryxdesign/core/IconButton';
import { CloseIcon } from '../icons/glyphs.js';
import './fan.css';

export interface FanCard {
  /** Stable while the card is on the fan: it keys the card's fan-in and fan-out. */
  id: string;
  label: string;
  content: React.ReactNode;
  /** Its control is the card's own, not the caller's. */
  remove?: { label: string; isDisabled: boolean; onRemove: () => void; testId?: string };
}

type Pose = { x: number; y: number; rotate: number; z: number; width: number };
/** Uneven y on purpose, so the fan reads as dropped (ONL-2593). */
const FAN: readonly (readonly Pose[])[] = [
  [],
  [{ x: 0, y: 0, rotate: 0, z: 3, width: 100 }],
  [{ x: 16, y: 4, rotate: 4, z: 3, width: 62 }, { x: -16, y: -5, rotate: -5, z: 2, width: 62 }],
  [{ x: 0, y: 5, rotate: 0, z: 3, width: 62 }, { x: 24, y: -7, rotate: 5, z: 2, width: 62 }, { x: -24, y: -2, rotate: -6, z: 1, width: 62 }],
  [{ x: 9, y: 6, rotate: 2, z: 4, width: 56 }, { x: -9, y: -3, rotate: -2, z: 3, width: 56 }, { x: 27, y: -9, rotate: 6, z: 2, width: 56 }, { x: -27, y: 2, rotate: -7, z: 1, width: 56 }],
  [{ x: 0, y: 7, rotate: 0, z: 5, width: 52 }, { x: 16, y: -4, rotate: 4, z: 4, width: 52 }, { x: -16, y: 1, rotate: -4, z: 3, width: 52 }, { x: 31, y: -10, rotate: 8, z: 2, width: 52 }, { x: -31, y: -6, rotate: -9, z: 1, width: 52 }],
];

export function FannedPreview({ cards }: { cards: readonly FanCard[] }): React.JSX.Element {
  const shown = cards.slice(0, FAN.length - 1);
  const poses = FAN[shown.length] ?? [];
  const [leaving, setLeaving] = useState<{ card: FanCard; pose: Pose }[]>([]);
  const last = useRef<{ card: FanCard; pose: Pose }[]>([]);
  const current = shown.map((card, index) => ({ card, pose: poses[index]! }));
  const shownKey = shown.map((card) => card.id).join('|');
  const kept = new Set(shown.map((card) => card.id));
  // Drawn in the same pass that drops them: a card that waited for the effect would unmount, and its picture reload mid-exit.
  const gone = last.current.filter((entry) => !kept.has(entry.card.id));
  const exiting = [...leaving.filter((entry) => !kept.has(entry.card.id) && !gone.some((left) => left.card.id === entry.card.id)), ...gone];

  useEffect(() => {
    last.current = current;
    setLeaving(exiting);
  }, [shownKey]);

  const forget = (id: string): void => {
    setLeaving((entries) => entries.filter((entry) => entry.card.id !== id));
  };

  const draw = (card: FanCard, pose: Pose, isLeaving: boolean): React.JSX.Element => (
    <div
      key={card.id}
      className="preview-fan-card"
      {...(isLeaving ? { 'data-leaving': '', 'aria-hidden': true, onAnimationEnd: (event: React.AnimationEvent) => { if (event.target === event.currentTarget) forget(card.id); } } : {})}
      style={{ '--fan-x': `${String(pose.x)}%`, '--fan-y': `${String(pose.y)}%`, '--fan-rotate': `${String(pose.rotate)}deg`, '--fan-width': `${String(pose.width)}%`, zIndex: isLeaving ? 0 : pose.z } as React.CSSProperties}
    >
      {card.content}
      {/* Off the leaving card: it is on its way out and already hidden from assistive technology. */}
      {card.remove !== undefined && !isLeaving && (
        <div className="preview-fan-remove">
          <IconButton
            label={card.remove.label}
            variant="ghost"
            size="sm"
            icon={<Icon icon={CloseIcon} size="sm" color="inherit" />}
            isDisabled={card.remove.isDisabled}
            onClick={card.remove.onRemove}
            {...(card.remove.testId === undefined ? {} : { 'data-testid': card.remove.testId })}
          />
        </div>
      )}
    </div>
  );

  // One array, so a card that starts leaving keeps its element rather than being re-created in it.
  const name = shown.map((card) => card.label).join(', ');
  return (
    <div className="preview-fan" {...(name === '' ? {} : { role: 'group', 'aria-label': name })}>
      {[
        ...exiting.map((left) => draw(left.card, left.pose, true)),
        ...current.map(({ card, pose }) => draw(card, pose, false)),
      ]}
    </div>
  );
}

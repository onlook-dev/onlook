import { comboCaps } from '../shortcuts/combo.js';

/** `Kbd` notation drawn as the guide's own key caps. */
export function KeyCombo({ keys }: { keys: string }): React.JSX.Element {
  return (
    <span>
      {comboCaps(keys).map((part, i) => (
        <kbd key={`${part}-${i}`} className="tips-kbd">
          {part}
        </kbd>
      ))}
    </span>
  );
}

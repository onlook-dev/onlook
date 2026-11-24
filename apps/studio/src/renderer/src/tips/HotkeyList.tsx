import { Fragment } from 'react';
import { t } from '@studio/i18n';
import { HOTKEY_GLYPHS } from '../icons/glyphs.js';
import type { HotkeyGroup } from './hotkeys.js';
import { KeyCombo } from './KeyCombo.js';

export function filterHotkeys(groups: readonly HotkeyGroup[], query: string): HotkeyGroup[] {
  const q = query.trim().toLowerCase();
  if (q === '') return [...groups];
  return groups
    .map((group) => ({
      ...group,
      rows: t(group.label).toLowerCase().includes(q) ? group.rows : group.rows.filter((row) => t(row.label).toLowerCase().includes(q)),
    }))
    .filter((group) => group.rows.length > 0);
}

export function HotkeyList({ groups, query }: { groups: readonly HotkeyGroup[]; query: string }): React.JSX.Element {
  return (
    <div className="tips-keys" data-testid="tips-hotkeys">
      {groups.length === 0 ? (
        <div className="tips-empty">{t('tips.empty.hotkeys', { query })}</div>
      ) : (
        <div className="tips-key-columns">
          {groups.map((group) => (
            <div key={group.label} className="tips-key-group">
              <h3>{t(group.label)}</h3>
              {group.rows.map((row) => {
                const Glyph = HOTKEY_GLYPHS[row.id];
                return (
                  <div key={row.id} className="tips-key-row" data-hotkey-row={row.id}>
                    <span className="tips-key-label">
                      <Glyph mode="raw" size={16} />
                      {t(row.label)}
                    </span>
                    <span className="tips-key-combo">
                      {row.combos.map((combo, i) => (
                        <Fragment key={combo}>
                          {i > 0 ? <span>{t('tips.keys.or')}</span> : null}
                          <KeyCombo keys={combo} />
                        </Fragment>
                      ))}
                      {row.word === undefined ? null : <span className="tips-key-word">{t(row.word)}</span>}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

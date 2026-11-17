import type { CodeMapGrade, CodeMapping } from '@studio/events';

import type { StringKey } from '@studio/i18n';

/** The one grade-to-copy map. A grade reaches copy nowhere else (ONL-2563). */
const CONFIDENCE: Record<CodeMapGrade, StringKey> = {
  exact: 'code.tint.exact',
  likely: 'code.tint.likely',
  'best-guess': 'code.tint.guess',
};

export interface LabelFacts {
  /** Null is a decline: unmappable Frame, nothing matched, or a guess that did not survive the clamp. */
  mapping: CodeMapping | null;
  /** The guest said the element the mapping was taken for is gone. */
  isStale: boolean;
}

export interface TintLabel {
  /** The element's name, as the page's React calls it; null when no component was resolved. */
  component: string | null;
  /** The one line the label says. Always set: a label with nothing in it reads as a failure. */
  sentenceKey: StringKey;
  /** False whenever Studio can no longer stand behind the mapping, for any reason. */
  claimsConfidence: boolean;
  /** The clause that warns an edit here reaches more than this one element. */
  reachKey: StringKey | null;
  reachCount: number;
  /** Lines stay tinted through staleness: the designer is still editing them. */
  isTinted: boolean;
  /** Other places it could be, offered only when Studio says it is guessing. */
  showsCandidates: boolean;
}

const DECLINED: TintLabel = {
  component: null,
  sentenceKey: 'code.tint.declined',
  claimsConfidence: false,
  reachKey: null,
  reachCount: 0,
  isTinted: false,
  showsCandidates: false,
};

/** What the panel says about the code behind the selection. The reach clause outlives staleness: editing a shared component believing it is one place stays true when the mapping stops being confirmable (ONL-2563). */
export function tintLabel(facts: LabelFacts): TintLabel {
  const { mapping } = facts;
  if (mapping === null) return DECLINED;

  const reach =
    mapping.producedComplete !== true
      ? { reachKey: (mapping.produced > 1 ? 'code.tint.rowsPartial' : 'code.tint.rowsUnknown') as StringKey, reachCount: mapping.produced }
      : mapping.produced > 1
      ? { reachKey: 'code.tint.rows' as StringKey, reachCount: mapping.produced }
      : mapping.component !== null && mapping.uses > 0
        ? { reachKey: 'code.tint.uses' as StringKey, reachCount: mapping.uses }
        : { reachKey: null, reachCount: 0 };

  return {
    component: mapping.component,
    sentenceKey: facts.isStale ? 'code.tint.unconfirmed' : mapping.via === 'component-stack' ? 'code.tint.component' : CONFIDENCE[mapping.grade],
    claimsConfidence: !facts.isStale && (mapping.grade === 'exact' || mapping.via === 'component-stack'),
    ...reach,
    isTinted: true,
    showsCandidates: !facts.isStale && mapping.grade === 'best-guess' && mapping.others.length > 0,
  };
}

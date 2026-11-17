import { useEffect, useState } from 'react';
import type { ArtifactSummary } from '@studio/events';
import { studio } from '../../bridge.js';

export function useArtifactSearch(query: string, records: ArtifactSummary[] | null) {
  const [result, setResult] = useState<{query: string; records: ArtifactSummary[] | null; ranks: ReadonlyMap<string, number>; loading: boolean; error: boolean; partial: boolean}>({query: '', records: null, ranks: new Map(), loading: false, error: false, partial: false});
  useEffect(() => {
    if (query.trim() === '') return;
    let active = true;
    const timer = setTimeout(() => {
      setResult({query, records, ranks: new Map(), loading: true, error: false, partial: false});
      void Promise.resolve().then(() => studio().artifactSearch({query})).then((answer) => {
        if (!active) return;
        setResult({query, records, ranks: new Map(answer.outcome === 'ready' ? answer.matches.map((match) => [match.artifactId, match.rank]) : []), loading: false, error: answer.outcome !== 'ready', partial: answer.outcome === 'ready' && answer.partial});
      }).catch(() => {if (active) setResult({query, records, ranks: new Map(), loading: false, error: true, partial: false});});
    }, 180);
    return () => {active = false; clearTimeout(timer);};
  }, [query, records]);
  return query.trim() === '' ? {ranks: undefined, loading: false, error: false, partial: false} : result.query !== query || result.records !== records ? {ranks: undefined, loading: true, error: false, partial: false} : result;
}

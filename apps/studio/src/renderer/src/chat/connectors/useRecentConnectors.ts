import { useEffect, useMemo, useReducer } from 'react';
import type { ConnectorInventory } from '@studio/events';

export const CONNECTOR_HIGHLIGHT_MS = 20_000;

export interface RecentConnectors {
  scope: string;
  ids?: ReadonlySet<string>;
  deadlines: ReadonlyMap<string, number>;
}

type Action = { type: 'inventory'; scope: string; inventory?: ConnectorInventory; now: number } | { type: 'expire'; now: number };

export function recentConnectors(state: RecentConnectors, action: Action): RecentConnectors {
  if (action.type === 'expire') return { ...state, deadlines: new Map([...state.deadlines].filter(([, deadline]) => deadline > action.now)) };
  const previous = action.scope === state.scope ? state : { scope: action.scope, deadlines: new Map<string, number>() };
  if (!action.inventory || action.inventory.unavailable) return previous;
  const ids = new Set(action.inventory.servers.map((server) => server.id));
  const deadlines = new Map([...previous.deadlines].filter(([id, deadline]) => ids.has(id) && deadline > action.now));
  if (previous.ids) {
    for (const server of action.inventory.servers) {
      if (!server.featured && !previous.ids.has(server.id)) deadlines.set(server.id, action.now + CONNECTOR_HIGHLIGHT_MS);
    }
  }
  return { scope: action.scope, ids, deadlines };
}

export function useRecentConnectors(scope: string, inventory: ConnectorInventory | undefined): ReadonlySet<string> {
  const [state, dispatch] = useReducer(recentConnectors, { scope, deadlines: new Map<string, number>() });
  useEffect(() => { dispatch({ type: 'inventory', scope, inventory, now: Date.now() }); }, [scope, inventory]);
  useEffect(() => {
    if (state.deadlines.size === 0) return;
    const deadline = Math.min(...state.deadlines.values());
    const timer = setTimeout(() => dispatch({ type: 'expire', now: Date.now() }), Math.max(0, deadline - Date.now()));
    return () => clearTimeout(timer);
  }, [state.deadlines]);
  return useMemo(() => new Set(state.scope === scope ? state.deadlines.keys() : []), [scope, state]);
}

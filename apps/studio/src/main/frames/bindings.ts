import { randomUUID } from 'node:crypto';
import { FRAME_ATTACH_PREFIX as ATTACH_PREFIX, FRAME_BIRTH_PREFIX as BIRTH_PREFIX, type CanvasDoc, type CanvasNode, type CanvasOp, type FrameDestinationReadiness } from '@studio/events';
type Owner = Pick<Electron.WebContents, 'id'>;
type Guest = Pick<Electron.WebContents, 'id' | 'hostWebContents' | 'isDestroyed'>;
type Claim = { owner: Owner; docId: string; nodeId: string; identity: string; url: string; expires: number; prepared: boolean; birth?: string; guest?: Guest };
type Birth = { started: boolean; owner?: Owner; claim?: Claim; launched: boolean; loaded: boolean };
type Binding = { claim: Claim; guest: Guest; state: 'pending' | 'issued' | 'started' | 'ready' };

const frameBindingIdentity = (node: CanvasNode): string => JSON.stringify([node.id, node.pageId, node.kind, node.content]);

function sameOrigin(a: string, b: string): boolean {
  try {
    return new URL(a).origin === new URL(b).origin;
  } catch {
    return false;
  }
}

export function createFrameBindings(now = Date.now) {
  const claims = new Map<string, Claim>();
  const created = new WeakMap<Guest, Birth>();
  const challenges = new Map<string, Claim>();
  const prepared = new WeakMap<Record<string, string>, Claim>();
  const seen = new WeakSet<Guest>();
  const latest = new Map<string, Claim>();
  const history = new Map<string, { claim: Claim; url: string }>();
  const bound = new Map<string, Binding>();
  const keyFor = (owner: Owner, docId: string, nodeId: string): string => JSON.stringify([owner.id, docId, nodeId]);
  const currentClaim = (claim: Claim): boolean => claim.expires > now() && latest.get(keyFor(claim.owner, claim.docId, claim.nodeId)) === claim;
  const currentBinding = (binding: Binding): boolean => currentClaim(binding.claim) && !binding.guest.isDestroyed() && binding.guest.hostWebContents === binding.claim.owner;
  const launch = (guest: Guest, birth: Birth): string | undefined => {
    const claim = birth.claim;
    if (!claim || !birth.loaded || !birth.owner || birth.launched || claim.owner !== birth.owner || guest.hostWebContents !== birth.owner || guest.isDestroyed() || !currentClaim(claim)) return undefined;
    birth.launched = true;
    claim.guest = guest;
    bound.set(keyFor(claim.owner, claim.docId, claim.nodeId), { claim, guest, state: 'pending' });
    return claim.url;
  };
  const forget = (owner: Owner): void => {
    for (const [token, claim] of claims) if (claim.owner === owner) claims.delete(token);
    for (const [token, claim] of challenges) if (claim.owner === owner) challenges.delete(token);
    for (const [key, binding] of bound) if (binding.claim.owner === owner) bound.delete(key);
    for (const [key, claim] of latest) if (claim.owner === owner) latest.delete(key);
    for (const [key, entry] of history) if (entry.claim.owner === owner) history.delete(key);
  };
  return {
    issue(owner: Owner, docId: string, node: CanvasNode, url: string): string | undefined {
      try {
        const destination = new URL(url);
        if (destination.protocol !== 'http:' && destination.protocol !== 'https:' && destination.protocol !== 'studio-artifact:') return undefined;
        url = destination.toString();
      } catch {
        return undefined;
      }
      for (const [token, claim] of claims) if (claim.expires <= now() || (claim.owner === owner && claim.docId === docId && claim.nodeId === node.id)) claims.delete(token);
      for (const [token, claim] of challenges) if (!currentClaim(claim)) challenges.delete(token);
      if (claims.size + challenges.size >= 256) return undefined;
      const token = randomUUID();
      bound.delete(keyFor(owner, docId, node.id));
      const claim = { owner, docId, nodeId: node.id, identity: frameBindingIdentity(node), url, expires: now() + 30_000, prepared: false };
      claims.set(token, claim);
      latest.set(keyFor(owner, docId, node.id), claim);
      return `${ATTACH_PREFIX}${token}`;
    },
    prepare(owner: Owner, preferences: Electron.WebPreferences, params: Record<string, string>, policies: (preferences: Electron.WebPreferences, params: Record<string, string>) => void = () => {}): boolean {
      delete preferences.additionalArguments;
      if (!params['src']?.startsWith(ATTACH_PREFIX)) { policies(preferences, params); return true; }
      const token = params['src'].slice(ATTACH_PREFIX.length);
      const claim = claims.get(token);
      if (!claim || claim.owner !== owner || claim.prepared || claim.expires <= now()) return false;
      claim.prepared = true;
      claims.delete(token);
      params['src'] = claim.url;
      policies(preferences, params);
      claim.birth = `${BIRTH_PREFIX}${randomUUID()}`;
      challenges.set(claim.birth, claim);
      prepared.set(params, claim);
      params['src'] = claim.birth;
      return true;
    },
    created(guest: Guest): void {
      if (seen.has(guest)) return;
      seen.add(guest);
      created.set(guest, { started: false, launched: false, loaded: false });
    },
    navigating(guest: Guest, url: string): string | undefined {
      for (const [key, binding] of bound) if (binding.guest === guest) {
        if (binding.state !== 'ready') {
          if (binding.state !== 'issued' || binding.claim.url !== url || !currentBinding(binding)) bound.delete(key);
          else binding.state = 'started';
        }
        return undefined;
      }
      const birth = created.get(guest);
      if (!birth) return undefined;
      if (birth.started) {
        if (!birth.launched) { birth.claim = undefined; birth.loaded = false; }
        return undefined;
      }
      birth.started = true;
      const claim = challenges.get(url);
      if (!claim || !currentClaim(claim) || guest.hostWebContents !== claim.owner) return undefined;
      challenges.delete(url);
      birth.claim = claim;
      return undefined;
    },
    attached(owner: Owner, guest: Guest): string | undefined {
      const birth = created.get(guest);
      if (!birth) return undefined;
      if (birth.owner) {
        created.delete(guest);
        for (const [key, binding] of bound) if (binding.guest === guest) bound.delete(key);
        return undefined;
      }
      if (guest.hostWebContents !== owner || guest.isDestroyed()) { created.delete(guest); return undefined; }
      birth.owner = owner;
      return launch(guest, birth);
    },
    loaded(guest: Guest, url: string): string | undefined {
      const birth = created.get(guest);
      if (!birth || !birth.claim || birth.claim.birth !== url || birth.loaded) return undefined;
      birth.loaded = true;
      return launch(guest, birth);
    },
    destination(guest: Guest): string | undefined {
      for (const binding of bound.values()) if (binding.guest === guest && binding.state !== 'ready' && currentBinding(binding)) return binding.claim.url;
      return undefined;
    },
    activate(guest: Guest, url: string): boolean {
      for (const binding of bound.values()) if (binding.guest === guest && binding.state === 'pending' && binding.claim.url === url && currentBinding(binding)) {
        binding.state = 'issued';
        return true;
      }
      return false;
    },
    failed(guest: Guest): void {
      for (const [key, binding] of bound) if (binding.guest === guest && binding.state !== 'ready') bound.delete(key);
    },
    preparedDestination(owner: Owner, params: Record<string, string>): string | undefined {
      const claim = prepared.get(params);
      return claim?.owner === owner && currentClaim(claim) && params['src'] === claim.birth ? claim.url : undefined;
    },
    birthNavigation(guest: Guest, url: string): boolean {
      const birth = created.get(guest);
      if (!birth || birth.launched || guest.isDestroyed()) return false;
      const claim = birth.claim?.birth === url ? birth.claim : !birth.started ? challenges.get(url) : undefined;
      return claim !== undefined && currentClaim(claim) && guest.hostWebContents === claim.owner && bound.get(keyFor(claim.owner, claim.docId, claim.nodeId))?.state !== 'ready';
    },
    readiness(owner: Owner, docId: string, node: CanvasNode, webContentsId: number): FrameDestinationReadiness {
      const key = keyFor(owner, docId, node.id);
      const claim = latest.get(key);
      const guest = claim?.guest;
      if (!claim || claim.owner !== owner || claim.identity !== frameBindingIdentity(node) || !guest || guest.id !== webContentsId || guest.hostWebContents !== owner || guest.isDestroyed()) return 'pending';
      const binding = bound.get(key);
      if (!binding) return 'retired';
      return binding.claim === claim && binding.guest === guest && binding.state === 'ready' ? 'ready' : 'pending';
    },
    guest(owner: Owner, docId: string, node: CanvasNode, artifactUrl?: string): Guest | undefined {
      const binding = bound.get(keyFor(owner, docId, node.id));
      if (!binding || binding.state !== 'ready' || binding.claim.owner !== owner || binding.guest.isDestroyed() || latest.get(keyFor(owner, docId, node.id)) !== binding.claim || binding.claim.identity !== frameBindingIdentity(node) || (node.kind === 'artifact' && binding.claim.url !== artifactUrl)) return undefined;
      return binding.guest;
    },
    destroyed(guest: Guest): void {
      created.delete(guest);
      for (const [key, binding] of bound) if (binding.guest === guest) bound.delete(key);
    },
    navigated(guest: Guest, url: string): void {
      const allowed = url.startsWith('http://') || url.startsWith('https://') || url.startsWith('studio-artifact://');
      for (const [key, binding] of bound) if (binding.guest === guest) {
        if (binding.state !== 'ready') {
          if (binding.state !== 'started' || binding.claim.url !== url || !allowed || !currentBinding(binding)) {
            bound.delete(key);
            continue;
          }
          binding.state = 'ready';
        }
        if (allowed) history.set(key, { claim: binding.claim, url });
      }
    },
    browserUrl(owner: Owner, docId: string, node: CanvasNode): string | undefined {
      const entry = history.get(keyFor(owner, docId, node.id));
      return node.kind === 'browser' && entry?.claim.owner === owner && entry.claim.identity === frameBindingIdentity(node) ? entry.url : undefined;
    },
    committed(before: CanvasDoc, after: CanvasDoc, op: CanvasOp): void {
      for (const [key, claim] of latest) {
        if (claim.docId !== before.docId) continue;
        const prior = before.nodes[claim.nodeId];
        const next = after.docId === before.docId ? after.nodes[claim.nodeId] : undefined;
        if (!prior || !next || claim.identity !== frameBindingIdentity(prior)) {
          latest.delete(key);
          bound.delete(key);
          history.delete(key);
          continue;
        }
        if (op.type === 'set-home-url' && op.id === claim.nodeId && prior.kind === 'browser' && next.kind === 'browser' && prior.pageId === next.pageId) {
          claim.identity = frameBindingIdentity(next);
          // A remembered route on an origin the home has left is where the next mount would go, and
          // whatever answers there now is not this project's app (ONL-3287).
          const remembered = history.get(key);
          if (remembered !== undefined && !sameOrigin(remembered.url, next.content.homeUrl)) history.delete(key);
        }
        if (claim.identity !== frameBindingIdentity(next)) {
          latest.delete(key);
          bound.delete(key);
          history.delete(key);
        }
      }
    },
    forget,
  };
}

export const frameBindings = createFrameBindings();

import { frameLinkMarkdown, isBrowserNode, type CanvasDoc } from '@studio/events';
import { inspirationOpening } from '../../instructions/inspiration.js';

export interface InspirationAsk {
  isOn: boolean;
  /** A turn running, or a prompt waiting in the pen. */
  isBusy: boolean;
  alreadyOpened: boolean;
  doc: CanvasDoc | null;
  frameId: string;
  repoIdentity: string | undefined;
}

export function inspirationOpeningFor(ask: InspirationAsk): string | undefined {
  if (!ask.isOn || ask.isBusy || ask.alreadyOpened || ask.repoIdentity === undefined) return undefined;
  const node = ask.doc?.nodes[ask.frameId];
  if (node === undefined || !isBrowserNode(node)) return undefined;
  return inspirationOpening({
    link: frameLinkMarkdown({ repoIdentity: ask.repoIdentity, frameId: node.id }, node.name),
    frameId: node.id,
    url: node.content.homeUrl,
  });
}

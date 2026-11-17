/** Resolved in-app by the renderer; nothing is registered with the OS (ONL-1995). */
export interface FrameLinkTarget {
  repoIdentity: string;
  frameId: string;
}

export const FRAME_LINK_SCHEME = 'onlook';

export function mintFrameLink(target: FrameLinkTarget): string {
  return (
    `${FRAME_LINK_SCHEME}://project/${encodeURIComponent(target.repoIdentity)}` +
    `/frame/${encodeURIComponent(target.frameId)}`
  );
}

// A regex, not `new URL`: a URL host is case-folded and a repo identity is not.
const PATTERN = new RegExp(`^${FRAME_LINK_SCHEME}://project/([^/?#]+)/frame/([^/?#]+)$`);

export function parseFrameLink(href: string): FrameLinkTarget | null {
  const match = PATTERN.exec(href);
  if (match === null) return null;
  try {
    const repoIdentity = decodeURIComponent(match[1] ?? '');
    const frameId = decodeURIComponent(match[2] ?? '');
    if (repoIdentity === '' || frameId === '') return null;
    return { repoIdentity, frameId };
  } catch {
    return null;
  }
}

export function frameLinkMarkdown(target: FrameLinkTarget, name: string): string {
  return `[${escapeLinkText(name)}](${mintFrameLink(target)})`;
}

function escapeLinkText(name: string): string {
  return name.replace(/([[\]])/g, '\\$1');
}

/** Names a worktree, not a repo: every worktree of a repo shares its identity; `workspaceName` is drawn unique (ONL-2212). */
export interface TabLinkTarget {
  repoIdentity: string;
  workspaceName: string;
}

export function mintTabLink(target: TabLinkTarget): string {
  return (
    `${FRAME_LINK_SCHEME}://project/${encodeURIComponent(target.repoIdentity)}` +
    `/workspace/${encodeURIComponent(target.workspaceName)}`
  );
}

const TAB_PATTERN = new RegExp(`^${FRAME_LINK_SCHEME}://project/([^/?#]+)/workspace/([^/?#]+)$`);

export function parseTabLink(href: string): TabLinkTarget | null {
  const match = TAB_PATTERN.exec(href);
  if (match === null) return null;
  try {
    const repoIdentity = decodeURIComponent(match[1] ?? '');
    const workspaceName = decodeURIComponent(match[2] ?? '');
    if (repoIdentity === '' || workspaceName === '') return null;
    return { repoIdentity, workspaceName };
  } catch {
    return null;
  }
}

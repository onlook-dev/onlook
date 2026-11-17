import { describe, expect, it } from 'bun:test';
import { frameLinkMarkdown, mintFrameLink, mintTabLink, parseFrameLink, parseTabLink } from './frame-link.js';

const target = { repoIdentity: 'github.com/onlook-dev/onlook', frameId: 'fr_1' };

describe('minting and reading back', () => {
  it('round-trips an identity carrying slashes, colons and an @', () => {
    const ssh = { repoIdentity: 'git@github.com:onlook-dev/onlook.git', frameId: 'fr_1' };
    expect(parseFrameLink(mintFrameLink(ssh))).toEqual(ssh);
  });

  it('round-trips an identity whose case matters', () => {
    const cased = { repoIdentity: 'github.com/Onlook-Dev/Onlook', frameId: 'fr_A' };
    expect(parseFrameLink(mintFrameLink(cased))).toEqual(cased);
  });

  it('survives a frame id that needs encoding', () => {
    const odd = { repoIdentity: 'r', frameId: 'a/b c?d#e' };
    expect(parseFrameLink(mintFrameLink(odd))).toEqual(odd);
  });
});

describe('what is NOT a frame link', () => {
  it('answers null for the links a transcript is actually full of', () => {
    for (const href of [
      'https://example.com',
      'http://localhost:3000/products',
      '/relative/path',
      'mailto:someone@example.com',
      '',
    ]) {
      expect(parseFrameLink(href)).toBeNull();
    }
  });

  it('answers null for a nearly-right shape', () => {
    for (const href of [
      'onlook://project/r/frame/',
      'onlook://project//frame/f',
      'onlook://project/r/frames/f',
      'onlook://projects/r/frame/f',
      'onlook:/project/r/frame/f',
      'onlook://project/r/frame/f/extra',
      'onlook://project/r/frame/f?x=1',
    ]) {
      expect(`${href} -> ${JSON.stringify(parseFrameLink(href))}`).toBe(`${href} -> null`);
    }
  });

  it('answers null rather than throwing on a malformed escape', () => {
    expect(() => parseFrameLink('onlook://project/%/frame/f')).not.toThrow();
    expect(parseFrameLink('onlook://project/%/frame/f')).toBeNull();
  });
});

describe('the markdown the agent writes', () => {
  it('renders the frame’s NAME as the link text', () => {
    expect(frameLinkMarkdown(target, 'Storefront')).toBe(
      `[Storefront](${mintFrameLink(target)})`,
    );
  });

  it('escapes brackets in a name so the link survives', () => {
    expect(frameLinkMarkdown(target, 'Checkout [beta]')).toContain('Checkout \\[beta\\]');
  });
});

describe('a tab link names a WORKTREE, not a repo (ONL-2212)', () => {
  const TARGET = { repoIdentity: 'github.com/acme/app', workspaceName: 'teal-skylark' };

  it('tells two worktrees of the SAME repo apart — the whole reason for the segment', () => {
    const sibling = { repoIdentity: TARGET.repoIdentity, workspaceName: 'amber-thicket' };

    expect(mintTabLink(TARGET)).not.toBe(mintTabLink(sibling));
    expect(parseTabLink(mintTabLink(sibling))).toEqual(sibling);
  });

  it('is NOT read as a frame link', () => {
    expect(parseFrameLink(mintTabLink(TARGET))).toBeNull();
  });

  it('does not read a frame link as a tab link', () => {
    expect(parseTabLink(mintFrameLink({ repoIdentity: 'github.com/acme/app', frameId: 'f1' }))).toBeNull();
  });

  it('rejects the bare repo form a repo-keyed link used to mint', () => {
    expect(parseTabLink('onlook://project/acme')).toBeNull();
  });

  it('rejects a trailing segment', () => {
    expect(parseTabLink('onlook://project/acme/workspace/one/extra')).toBeNull();
  });

  it('rejects a query and a fragment', () => {
    expect(parseTabLink('onlook://project/acme/workspace/one?x=1')).toBeNull();
    expect(parseTabLink('onlook://project/acme/workspace/one#top')).toBeNull();
  });

  it('rejects an empty identity or an empty workspace', () => {
    expect(parseTabLink('onlook://project//workspace/one')).toBeNull();
    expect(parseTabLink('onlook://project/acme/workspace/')).toBeNull();
  });

  it('rejects bad percent-encoding rather than throwing', () => {
    expect(parseTabLink('onlook://project/%E0%A4%A/workspace/one')).toBeNull();
  });
});


import { describe, expect, it } from 'bun:test';
import { displayUrl, normalizeDevUrl } from '@studio/events';
import { FRAME_NODE_TYPE, frameRecoveryUrl, isAtLocalPort, liveFramePorts, newFrameUrl, type CanvasFlowNode, type FrameNodeData } from './model.js';

function frame(id: string, data: Partial<FrameNodeData>): CanvasFlowNode {
  return {
    id,
    type: FRAME_NODE_TYPE,
    position: { x: 0, y: 0 },
    data: { homeUrl: 'about:blank', name: id, currentUrl: 'about:blank', health: 'loading', title: '', canGoBack: false, canGoForward: false, ...data },
  };
}

describe('liveFramePorts', () => {
  it('counts a Frame only once its page is live and no server cover stands in for it', () => {
    expect(liveFramePorts([
      frame('live', { currentUrl: 'http://localhost:5173/pricing', health: 'live' }),
      frame('loading', { currentUrl: 'http://localhost:3000/', health: 'loading' }),
      frame('covered', { currentUrl: 'http://localhost:4000/', health: 'live', serverCover: 'dead' }),
      frame('remote', { currentUrl: 'https://example.com/', health: 'live' }),
    ])).toEqual([5173]);
  });

  it('reads a pending Frame as not live, since its page has not loaded', () => {
    expect(liveFramePorts([frame('pending', { currentUrl: 'http://localhost:5180/', serverCover: 'non-started' })])).toEqual([]);
  });
});

describe('newFrameUrl', () => {
  it('prefers an existing project origin, then a live server, then a blank page', () => {
    expect(newFrameUrl('http://localhost:4321/deep/path', 5173)).toBe('http://localhost:4321');
    expect(newFrameUrl(undefined, 5173)).toBe('http://localhost:5173');
    expect(newFrameUrl(undefined, null)).toBe('about:blank');
  });
});

describe('normalizeDevUrl', () => {
  it('accepts a bare port, which is what a designer actually types', () => {
    expect(normalizeDevUrl('3000')).toBe('http://localhost:3000/');
    expect(normalizeDevUrl('  3000  ')).toBe('http://localhost:3000/');
  });

  it('rejects a port outside the range, and only outside it', () => {
    expect(normalizeDevUrl('1')).toBe('http://localhost:1/');
    expect(normalizeDevUrl('0')).toBeNull();

    expect(normalizeDevUrl('65535')).toBe('http://localhost:65535/');
    expect(normalizeDevUrl('65536')).toBeNull();
  });

  it('forces a scheme onto a bare host, and keeps one that is already there', () => {
    expect(normalizeDevUrl('localhost:5173')).toBe('http://localhost:5173/');
    expect(normalizeDevUrl('127.0.0.1:3000')).toBe('http://127.0.0.1:3000/');
    expect(normalizeDevUrl('example.com')).toBe('http://example.com/');

    expect(normalizeDevUrl('https://example.com')).toBe('https://example.com/');

    expect(normalizeDevUrl('HTTP://Localhost:3000')).toBe('http://localhost:3000/');
  });

  it('returns null rather than guessing at garbage', () => {
    expect(normalizeDevUrl('')).toBeNull();
    expect(normalizeDevUrl('   ')).toBeNull();
    expect(normalizeDevUrl('http://')).toBeNull();
    expect(normalizeDevUrl('not a url')).toBeNull();
    expect(normalizeDevUrl('hello world')).toBeNull();
    expect(normalizeDevUrl('::::')).toBeNull();
  });

  it('refuses a scheme it cannot navigate to, instead of reading it as a hostname', () => {
    expect(normalizeDevUrl('ftp://x')).toBeNull();
    expect(normalizeDevUrl('ws://localhost:3000')).toBeNull();
    expect(normalizeDevUrl('file:///etc/passwd')).toBeNull();
    expect(normalizeDevUrl('FTP://x')).toBeNull();
  });
});

describe('displayUrl', () => {
  it('keeps a non-default port, a path and a query — all three are information', () => {
    expect(displayUrl('http://example.com:8080/a/b')).toBe('example.com:8080/a/b');
    expect(displayUrl('http://localhost:3000/app?x=1')).toBe('localhost:3000/app?x=1');
  });

  it('shows unparseable input verbatim rather than swallowing it', () => {
    expect(displayUrl('not a url')).toBe('not a url');
    expect(displayUrl('')).toBe('');
  });
});

describe('isAtLocalPort', () => {
  it('separates on-this-port from not-this-machine', () => {
    expect(isAtLocalPort('http://localhost:3000/', 3000)).toBe(true);
    expect(isAtLocalPort('https://staging.example.com/', 3000)).toBe(false);
    expect(isAtLocalPort('https://example.com:3000/', 3000)).toBe(false);
  });

  it('recognises every spelling of this machine', () => {
    expect(isAtLocalPort('http://127.0.0.1:5173/', 5173)).toBe(true);
    expect(isAtLocalPort('http://0.0.0.0:5173/', 5173)).toBe(true);
    expect(isAtLocalPort('http://[::1]:5173/', 5173)).toBe(true);
    expect(isAtLocalPort('http://localhost:5173/', 5173)).toBe(true);
  });

  it('is about ONE port, not about localhost', () => {
    expect(isAtLocalPort('http://localhost:5173/', 3000)).toBe(false);
  });

  it('reads a default port the way WHATWG leaves it', () => {
    expect(isAtLocalPort('http://localhost/', 80)).toBe(true);
    expect(isAtLocalPort('https://localhost/', 443)).toBe(true);
    expect(isAtLocalPort('http://localhost/', 443)).toBe(false);
    expect(isAtLocalPort('https://localhost/', 80)).toBe(false);
  });

  it('says no to something that is not a URL', () => {
    expect(isAtLocalPort('not a url', 3000)).toBe(false);
  });
});

describe('frameRecoveryUrl', () => {
  it('prefers a navigation still in flight, since no later address has been asked for yet', () => {
    expect(frameRecoveryUrl({
      target: { url: 'http://localhost:3000/next' },
      loadFailure: { url: 'http://localhost:3000/old' },
      currentUrl: 'http://localhost:3000/old',
    })).toBe('http://localhost:3000/next');
  });

  it('names the page that failed, which a refused navigation never made current', () => {
    expect(frameRecoveryUrl({
      loadFailure: { url: 'http://localhost:3000/b' },
      currentUrl: 'http://localhost:3000/a',
    })).toBe('http://localhost:3000/b');
  });

  it('falls back to the guest for a crash, which names no failed URL', () => {
    expect(frameRecoveryUrl({ currentUrl: 'http://localhost:3000/b' })).toBe('http://localhost:3000/b');
    expect(frameRecoveryUrl({ loadFailure: { url: '' }, currentUrl: 'http://localhost:3000/b' })).toBe('http://localhost:3000/b');
  });

  it('keeps the app as the subject when a redirect off it died, which Restart cannot reach', () => {
    expect(frameRecoveryUrl({
      loadFailure: { url: 'https://auth.example.test/login' },
      currentUrl: 'http://localhost:3000/b',
    })).toBe('http://localhost:3000/b');
    expect(frameRecoveryUrl({
      loadFailure: { url: 'https://localhost:5173/dashboard' },
      currentUrl: 'http://localhost:5173/',
    })).toBe('https://localhost:5173/dashboard');
  });
});

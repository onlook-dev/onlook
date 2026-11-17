import type { FrameServerCover, FrameShown } from '@studio/events';

const SERVER_WORDS: Record<FrameServerCover, string> = {
  'non-started': 'its dev server is not running. Start it to bring the page back.',
  dead: 'its dev server stopped. Start it to bring the page back.',
  'users-own': 'their own server on this port is down. You cannot start it; ask them to.',
  occupied: 'another app holds this port.',
  container: 'a container holds this port.',
};

/** What the user sees over or instead of a frame's page, for the agent's capture; `covers` is the `frame-covers` flag, and off it names main's notices (ONL-2960). */
export function frameShownWords(shown: FrameShown | undefined, clearQuoteTool: string, covers: boolean): string | undefined {
  switch (shown?.kind) {
    case undefined:
    case 'page':
      return undefined;
    case 'quote':
      return covers ? `The user sees your quote over this frame, not the page. ${clearQuoteTool} removes it.` : undefined;
    case 'cover':
      return `The user sees ${covers ? 'a cover' : 'a notice'} instead of this page: ${SERVER_WORDS[shown.cover]}`;
    case 'load-failed':
      return 'The user sees a notice that this page failed to load, instead of the page.';
    case 'unreachable':
      return 'The user sees a notice that this page is not answering, instead of the page.';
    case 'loading':
      return covers
        ? 'The page has not painted yet. The user sees an empty frame.'
        : 'The page has not painted yet. The user sees a loading label, or the frame’s last picture.';
    case 'starting':
      return covers
        ? 'The app is starting and the page has not painted yet. The user sees a cover saying the app is starting.'
        : 'The app is starting and the page has not painted yet. The user sees a loading label.';
  }
}

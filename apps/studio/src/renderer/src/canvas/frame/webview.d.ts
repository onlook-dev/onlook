import type { DetailedHTMLProps, HTMLAttributes } from 'react';
import type { WebviewTag } from 'electron';

/**
 * The guest's real privileges are set by main in `src/main/frames/index.ts`,
 * which overrides whatever is asked for here.
 */
interface WebviewAttributes extends HTMLAttributes<WebviewTag> {
  src?: string;
  partition?: string;
  allowpopups?: string;
  useragent?: string;
  webpreferences?: string;
}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      webview: DetailedHTMLProps<WebviewAttributes, WebviewTag>;
    }
  }
}

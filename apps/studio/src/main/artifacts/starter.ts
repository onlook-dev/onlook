import { t } from '@studio/i18n';

const escape = (text: string): string =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Composed in main so the copy goes through the catalogue rather than crossing IPC uncaught (ONL-2568). */
export function starterPage(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escape(t('canvas.artifact.starter.title'))}</title>
    <style>
      :root { color-scheme: light; }
      body {
        margin: 0;
        /* With the default content-box the padding is added to the 100vh and a blank page scrolls. */
        box-sizing: border-box;
        min-height: 100vh;
        display: grid;
        place-content: center;
        gap: 6px;
        /* A drawn artifact can be far smaller than the default box, where a fixed 32px is most of it. */
        padding: clamp(16px, 6%, 32px);
        text-align: center;
        font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
        color: #8a8a8e;
        background: #ffffff;
      }
      h1 { margin: 0; font-size: 17px; font-weight: 500; letter-spacing: -0.01em; color: #6e6e73; text-wrap: balance; }
      p { margin: 0; font-size: 13px; line-height: 1.45; color: #a1a1a6; max-width: 30ch; text-wrap: pretty; }
    </style>
  </head>
  <body>
    <h1>${escape(t('canvas.artifact.starter.heading'))}</h1>
    <p>${escape(t('canvas.artifact.starter.body'))}</p>
  </body>
</html>
`;
}

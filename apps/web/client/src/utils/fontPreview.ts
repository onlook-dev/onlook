export function ensureGoogleFontLoaded(fontFamily: string, weights: (string | number)[] = ['400']) {
  if (!fontFamily) return;
  const fontId = fontFamily.replace(/ /g, '+');
  const weightStr = weights.length ? ':' + weights.join(',') : '';
  const linkId = `font-preview-link-${fontId}${weightStr.replace(/[^0-9,]/g, '')}`;
  if (!document.getElementById(linkId)) {
    const link = document.createElement('link');
    link.id = linkId;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css?family=${fontId}${weightStr}&display=swap`;
    document.head.appendChild(link);
  }
} 
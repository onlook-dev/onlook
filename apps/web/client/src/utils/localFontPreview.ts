export function ensureLocalFontLoaded(fontFamily: string, src: string, weight: string | number = '400', style: string = 'normal') {
  if (!fontFamily || !src) return;
  const styleId = `font-preview-style-${fontFamily.replace(/\s+/g, '-')}-${weight}-${style}`;
  if (!document.getElementById(styleId)) {
    const styleTag = document.createElement('style');
    styleTag.id = styleId;
    styleTag.innerHTML = `
      @font-face {
        font-family: '${fontFamily}';
        src: url('${src}') format('woff2');
        font-weight: ${weight};
        font-style: ${style};
        font-display: swap;
      }
    `;
    document.head.appendChild(styleTag);
  }
} 
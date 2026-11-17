import { GlyphFiles } from '../../icons/glyphs.js';

type FileType = 'react' | 'typescript' | 'javascript' | 'stylesheet' | 'markdown' | 'data' | 'html' | 'image' | 'file';

const EXTENSIONS: Readonly<Record<string, FileType>> = {
  tsx: 'react', jsx: 'react',
  ts: 'typescript', mts: 'typescript', cts: 'typescript',
  js: 'javascript', mjs: 'javascript', cjs: 'javascript',
  css: 'stylesheet', scss: 'stylesheet', sass: 'stylesheet', less: 'stylesheet',
  md: 'markdown', mdx: 'markdown',
  json: 'data', jsonc: 'data', yaml: 'data', yml: 'data', toml: 'data',
  html: 'html', htm: 'html', svg: 'image', png: 'image', jpg: 'image', jpeg: 'image',
  gif: 'image', webp: 'image', avif: 'image', ico: 'image',
};

export function fileType(path: string): FileType {
  const name = path.split('/').at(-1) ?? path;
  const dot = name.lastIndexOf('.');
  return dot <= 0 ? 'file' : EXTENSIONS[name.slice(dot + 1).toLowerCase()] ?? 'file';
}

const COLOR: Record<Exclude<FileType, 'file'>, string> = {
  react: '#61dafb', typescript: '#69aaf5', javascript: '#f0db4f',
  stylesheet: '#b794f6', markdown: '#91a4ba', data: '#dfb66d',
  html: '#ed9170', image: '#8acb91',
};

/** Decorative, like the folder glyph: the adjacent filename remains the accessible label. */
export function FileTypeIcon({ path }: { path: string }): React.JSX.Element {
  const type = fileType(path);
  if (type === 'file') {
    return <GlyphFiles mode="raw" size={14} style={{ flexShrink: 0, color: 'var(--color-text-secondary)' }} />;
  }
  return (
    <svg aria-hidden="true" focusable="false" data-file-type={type} width={14} height={14}
      viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, color: COLOR[type] }}>
      {type === 'react' ? (
        <g stroke="currentColor" strokeWidth="0.9">
          <ellipse cx="8" cy="8" rx="7" ry="2.7" />
          <ellipse cx="8" cy="8" rx="7" ry="2.7" transform="rotate(60 8 8)" />
          <ellipse cx="8" cy="8" rx="7" ry="2.7" transform="rotate(120 8 8)" />
          <circle cx="8" cy="8" r="1.2" fill="currentColor" stroke="none" />
        </g>
      ) : type === 'typescript' || type === 'javascript' ? (
        <>
          <rect x="1" y="1" width="14" height="14" rx="1.5" fill="currentColor" />
          <text x="8" y="11.3" textAnchor="middle" fill="#101820" fontFamily="Arial, sans-serif" fontSize="8" fontWeight="bold">
            {type === 'typescript' ? 'TS' : 'JS'}
          </text>
        </>
      ) : type === 'image' ? (
        <g stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round">
          <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" />
          <circle cx="5" cy="6" r="1" />
          <path d="m2 12 4-4 3 3 2-2 3 3" />
        </g>
      ) : type === 'markdown' ? (
        <g stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1.5 12V4l3 4 3-4v8M12 4v8m-2-2 2 2 2-2" />
        </g>
      ) : (
        <text x="8" y="12" textAnchor="middle" fill="currentColor" fontFamily="monospace" fontWeight="bold"
          fontSize={type === 'stylesheet' ? '15' : '10'}>
          {type === 'stylesheet' ? '#' : type === 'data' ? '{}' : '<>'}
        </text>
      )}
    </svg>
  );
}

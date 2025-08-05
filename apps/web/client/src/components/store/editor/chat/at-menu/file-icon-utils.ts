/**
 * Get the appropriate icon string for a file based on its extension
 */
export function getFileIconString(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    return 'file';
  }
  
  const extension = filename.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'tsx':
    case 'ts':
    case 'jsx':
    case 'js':
    case 'mjs':
    case 'cjs':
      return 'code';
    case 'json':
      return 'code';
    case 'css':
    case 'scss':
    case 'sass':
      return 'code';
    case 'html':
    case 'htm':
      return 'code';
    case 'md':
      return 'file';
    case 'py':
      return 'code';
    case 'php':
      return 'code';
    case 'rb':
      return 'code';
    case 'go':
      return 'code';
    case 'rs':
      return 'code';
    case 'java':
      return 'code';
    case 'cpp':
    case 'c':
    case 'h':
    case 'hpp':
      return 'code';
    case 'cs':
      return 'code';
    case 'swift':
      return 'code';
    case 'kt':
      return 'code';
    case 'scala':
      return 'code';
    case 'r':
      return 'code';
    case 'sql':
      return 'code';
    case 'sh':
    case 'bash':
    case 'zsh':
    case 'fish':
    case 'ps1':
    case 'bat':
    case 'cmd':
      return 'code';
    case 'yml':
    case 'yaml':
    case 'toml':
      return 'code';
    case 'ini':
    case 'cfg':
    case 'conf':
      return 'code';
    case 'xml':
    case 'svg':
      return 'code';
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
      return 'image';
    default:
      return 'file';
  }
} 
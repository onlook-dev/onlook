import type { AtMenuItem } from './types';
import { RecentActivityTracker } from './recent-activity';
import { getFileIconString } from './file-icon-utils';

export class AtMenuDataProviders {
  private editorEngine: any;

  constructor(editorEngine: any) {
    this.editorEngine = editorEngine;
  }

  // Get recent items from tracked activity
  getRecents(): AtMenuItem[] {
    // Get recent items from the activity tracker (max 3 items)
    const recentItems = RecentActivityTracker.getRecentItems(3);
    
    // Only return items if there are actual recent activities
    // No fallback items - if no recent activity, return empty array
    return recentItems;
  }

  // Get plain files from the IDE (non-code files)
  getFiles(): AtMenuItem[] {
    const items: AtMenuItem[] = [];
    
    // Try to get files from the IDE
    const files = this.editorEngine?.ide?.files || [];
    
    console.log('AtMenu getFiles: editorEngine:', !!this.editorEngine, 'ide:', !!this.editorEngine?.ide, 'files:', files);
    
    if (files.length > 0) {
      // Process each file path and create file items
      files.forEach((filePath: string) => {
        // Skip directories (they end with /)
        if (filePath.endsWith('/')) {
          return;
        }
        
        const fileName = filePath.split('/').pop() || '';
        if (fileName && !this.isCodeFile(fileName)) {
          items.push({
            id: `file-${filePath}`,
            type: 'file',
            name: fileName,
            path: filePath,
            category: 'files',
            icon: getFileIconString(fileName)
          });
        }
      });
    }

    // If no files found, add some fallback items to ensure section is visible
    if (items.length === 0) {
      items.push(
        { id: 'file-fallback-1', type: 'file', name: 'logo.png', path: '/assets/logo.png', category: 'files', icon: 'image' },
        { id: 'file-fallback-2', type: 'file', name: 'document.pdf', path: '/docs/document.pdf', category: 'files', icon: 'file' },
        { id: 'file-fallback-3', type: 'file', name: 'data.zip', path: '/data.zip', category: 'files', icon: 'file' }
      );
    }

    console.log('AtMenu getFiles: returning items:', items);
    return items;
  }

  // Get code files from the IDE
  getCodeFiles(): AtMenuItem[] {
    const codeFiles: AtMenuItem[] = [];
    
    // Get files from IDE
    const files = this.editorEngine?.ide?.files || [];
    
    console.log('AtMenu getCodeFiles: editorEngine:', !!this.editorEngine, 'ide:', !!this.editorEngine?.ide, 'files:', files);
    
    // Filter files that are code files
    files.forEach((filePath: string) => {
      const fileName = filePath.split('/').pop() || '';
      if (fileName && this.isCodeFile(fileName)) {
        codeFiles.push({
          id: `code-${filePath}`,
          type: 'file',
          name: fileName,
          path: filePath,
          category: 'code',
          icon: getFileIconString(fileName)
        });
      }
    });

    // If no code files found, add some fallback items to ensure section is visible
    if (codeFiles.length === 0) {
      codeFiles.push(
        { id: 'code-fallback-1', type: 'file', name: 'index.html', path: '/index.html', category: 'code', icon: 'code' },
        { id: 'code-fallback-2', type: 'file', name: 'styles.css', path: '/styles.css', category: 'code', icon: 'code' },
        { id: 'code-fallback-3', type: 'file', name: 'script.js', path: '/script.js', category: 'code', icon: 'code' },
        { id: 'code-fallback-4', type: 'file', name: 'package.json', path: '/package.json', category: 'code', icon: 'code' }
      );
    }

    console.log('AtMenu getCodeFiles: returning items:', codeFiles);
    return codeFiles;
  }

  // Get left panel options
  getLeftPanelItems(): AtMenuItem[] {
    const leftPanelItems: AtMenuItem[] = [
      {
        id: 'layers',
        type: 'tab',
        name: 'Layers',
        path: '/layers',
        category: 'leftPanel',
        icon: 'layers'
      },
      {
        id: 'brand',
        type: 'tab',
        name: 'Brand',
        path: '/brand',
        category: 'leftPanel',
        icon: 'brand'
      },
      {
        id: 'pages',
        type: 'tab',
        name: 'Pages',
        path: '/pages',
        category: 'leftPanel',
        icon: 'file'
      },
      {
        id: 'images',
        type: 'tab',
        name: 'Images',
        path: '/images',
        category: 'leftPanel',
        icon: 'image'
      },
      {
        id: 'apps',
        type: 'tab',
        name: 'Apps',
        path: '/apps',
        category: 'leftPanel',
        icon: 'viewGrid'
      },
      {
        id: 'elements',
        type: 'tab',
        name: 'Elements',
        path: '/elements',
        category: 'leftPanel',
        icon: 'component'
      }
    ];

    return leftPanelItems;
  }

  // Helper function to determine if a file is a code file
  private isCodeFile(filename: string): boolean {
    if (!filename || typeof filename !== 'string') {
      return false;
    }
    
    const extension = filename.split('.').pop()?.toLowerCase();
    
    // Define code file extensions
    const codeExtensions = [
      'js', 'jsx', 'ts', 'tsx', 'py', 'json', 'html', 'htm', 'css', 'scss', 'sass',
      'md', 'mjs', 'cjs', 'jsx', 'tsx', 'vue', 'svelte', 'php', 'rb', 'go', 'rs',
      'java', 'cpp', 'c', 'h', 'hpp', 'cs', 'swift', 'kt', 'scala', 'r', 'sql',
      'sh', 'bash', 'zsh', 'fish', 'ps1', 'bat', 'cmd', 'yml', 'yaml', 'toml',
      'ini', 'cfg', 'conf', 'xml', 'svg', 'jsx', 'tsx', 'vue', 'svelte'
    ];
    
    return codeExtensions.includes(extension || '');
  }

  // Get all items for the @ menu
  getAllItems(): AtMenuItem[] {
    console.log('AtMenuDataProviders: getAllItems called');
    const recents = this.getRecents();
    const files = this.getFiles();
    const code = this.getCodeFiles();
    const leftPanel = this.getLeftPanelItems();
    
    const allItems = [
      ...recents,
      ...files,
      ...code,
      ...leftPanel
    ];
    
    console.log('AtMenuDataProviders: allItems before fallback:', allItems.length);
    
    // Always ensure we have at least some items - even if files are not loaded yet
    if (allItems.length === 0) {
      allItems.push(
        { id: 'fallback-1', type: 'file', name: 'package.json', path: '/', category: 'code', icon: 'code' },
        { id: 'fallback-2', type: 'file', name: 'README.md', path: '/', category: 'code', icon: 'file' },
        { id: 'fallback-3', type: 'tab', name: 'Layers', path: '/layers', category: 'leftPanel', icon: 'layers' }
      );
    }
    
    // If we have no files but have left panel items, that's fine
    // If we have no files and no left panel items, add some fallbacks
    if (files.length === 0 && code.length === 0 && leftPanel.length > 0) {
      // We have left panel items but no files, that's okay
    } else if (files.length === 0 && code.length === 0 && leftPanel.length === 0) {
      // No files and no left panel items, add fallbacks
      allItems.push(
        { id: 'fallback-4', type: 'file', name: 'index.html', path: '/index.html', category: 'code', icon: 'code' },
        { id: 'fallback-5', type: 'file', name: 'styles.css', path: '/styles.css', category: 'code', icon: 'code' },
        { id: 'fallback-6', type: 'file', name: 'script.js', path: '/script.js', category: 'code', icon: 'code' }
      );
    }
    
    console.log('AtMenuDataProviders: returning items:', allItems);
    return allItems;
  }
} 
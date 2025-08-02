import type { AtMenuItem } from './types';

export class AtMenuDataProviders {
  private editorEngine: any;

  constructor(editorEngine: any) {
    this.editorEngine = editorEngine;
  }

  // Get recent items from chat context and recently accessed files
  getRecents(): AtMenuItem[] {
    const recents: AtMenuItem[] = [];
    
    // Get recently accessed files from IDE
    const recentFiles = this.editorEngine?.ide?.openedFiles?.slice(0, 3) || [];
    recentFiles.forEach((file: any, index: number) => {
      recents.push({
        id: `recent-${index}`,
        type: 'file',
        name: file.filename,
        path: file.path,
        category: 'recents',
        icon: this.getFileIcon(file.filename)
      });
    });

    // If no recent files, add some fallback items
    if (recents.length === 0) {
      recents.push(
        { id: 'recent-fallback-1', type: 'file', name: 'index.html', path: '/', category: 'recents', icon: 'code' },
        { id: 'recent-fallback-2', type: 'file', name: 'styles.css', path: '/', category: 'recents', icon: 'code' }
      );
    }

    return recents;
  }

  // Get folders and files from the IDE
  getFoldersAndFiles(): AtMenuItem[] {
    const items: AtMenuItem[] = [];
    
    const processFiles = (files: any[], parentPath = ''): AtMenuItem[] => {
      return files.map((file: any) => {
        const fullPath = parentPath ? `${parentPath}/${file.name}` : file.name;
        
        if (file.type === 'directory') {
          return {
            id: `folder-${fullPath}`,
            type: 'folder',
            name: file.name,
            path: fullPath,
            hasChildren: file.children && file.children.length > 0,
            children: file.children ? processFiles(file.children, fullPath) : undefined,
            category: 'folders'
          };
        } else {
          return {
            id: `file-${fullPath}`,
            type: 'file',
            name: file.name,
            path: fullPath,
            category: 'folders',
            icon: this.getFileIcon(file.name)
          };
        }
      });
    };

    // Try to get files from different possible sources
    let files = [];
    if (this.editorEngine?.ide?.files) {
      files = this.editorEngine.ide.files;
    } else if (this.editorEngine?.project?.files?.getAllFiles) {
      files = this.editorEngine.project.files.getAllFiles();
    }
    
    if (files.length > 0) {
      return processFiles(files);
    }

    // Fallback items if no files found
    return [
      { id: 'folder-fallback-1', type: 'folder', name: 'src', path: '/src', category: 'folders', hasChildren: true },
      { id: 'file-fallback-1', type: 'file', name: 'index.html', path: '/index.html', category: 'folders', icon: 'code' },
      { id: 'file-fallback-2', type: 'file', name: 'styles.css', path: '/styles.css', category: 'folders', icon: 'code' }
    ];
  }

  // Get code configuration files
  getCodeFiles(): AtMenuItem[] {
    const codeFiles = [
      'package.json',
      'tsconfig.json',
      'next.config.ts',
      'tailwind.config.ts',
      'eslint.config.js',
      'prettier.config.js',
      'bun.lock',
      'Dockerfile',
      '.gitignore',
      'README.md'
    ];

    return codeFiles.map((filename, index) => ({
      id: `code-${index}`,
      type: 'file',
      name: filename,
      path: `/${filename}`,
      category: 'code',
      icon: 'code'
    }));
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

  // Helper function to get appropriate icon for file types
  private getFileIcon(filename: string): string {
    if (!filename || typeof filename !== 'string') {
      return 'file';
    }
    
    const extension = filename.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'tsx':
      case 'ts':
      case 'jsx':
      case 'js':
        return 'code';
      case 'json':
        return 'code';
      case 'css':
      case 'scss':
      case 'sass':
        return 'code';
      case 'md':
        return 'file';
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'svg':
        return 'image';
      default:
        return 'file';
    }
  }

  // Get all items for the @ menu
  getAllItems(): AtMenuItem[] {
    const recents = this.getRecents();
    const folders = this.getFoldersAndFiles();
    const code = this.getCodeFiles();
    const leftPanel = this.getLeftPanelItems();
    
    const allItems = [
      ...recents,
      ...folders,
      ...code,
      ...leftPanel
    ];
    
    // Always ensure we have at least some items
    if (allItems.length === 0) {
      allItems.push(
        { id: 'fallback-1', type: 'file', name: 'package.json', path: '/', category: 'code', icon: 'code' },
        { id: 'fallback-2', type: 'file', name: 'README.md', path: '/', category: 'code', icon: 'file' },
        { id: 'fallback-3', type: 'tab', name: 'Layers', path: '/layers', category: 'leftPanel', icon: 'layers' }
      );
    }
    
    return allItems;
  }
} 
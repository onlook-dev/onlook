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

  // Get folders from the IDE
  getFolders(): AtMenuItem[] {
    const folders: AtMenuItem[] = [];
    
    // Try to get directories from the sandbox
    const directories = this.editorEngine?.sandbox?.directories || [];
    
    console.log('AtMenu getFolders: editorEngine:', !!this.editorEngine, 'sandbox:', !!this.editorEngine?.sandbox, 'directories:', directories);
    
    if (directories.length > 0) {
      // Process each directory path and create folder items
      directories.forEach((dirPath: string) => {
        // Skip root directory
        if (dirPath === '/' || dirPath === './') {
          return;
        }
        
        const folderName = dirPath.split('/').pop() || '';
        if (folderName) {
          folders.push({
            id: `folder-${dirPath}`,
            type: 'folder',
            name: folderName,
            path: dirPath,
            category: 'files',
            icon: 'directory',
            hasChildren: true
          });
        }
      });
    }

    console.log('AtMenu getFolders: returning items:', folders);
    return folders;
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

  // Get folders & files combined and sorted alphabetically
  getFoldersAndFiles(): AtMenuItem[] {
    const folders = this.getFolders();
    const files = this.getFiles();
    
    // Combine folders and files
    const combined = [...folders, ...files];
    
    // Sort alphabetically by name
    combined.sort((a, b) => a.name.localeCompare(b.name));
    
    console.log('AtMenu getFoldersAndFiles: returning items:', combined);
    return combined;
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
        id: 'brand',
        type: 'tab',
        name: 'Brand',
        path: '/brand',
        category: 'leftPanel',
        icon: 'brand',
        hasChildren: true
      },
      {
        id: 'pages',
        type: 'tab',
        name: 'Pages',
        path: '/pages',
        category: 'leftPanel',
        icon: 'file',
        hasChildren: true
      },
      {
        id: 'images',
        type: 'tab',
        name: 'Images',
        path: '/images',
        category: 'leftPanel',
        icon: 'image',
        hasChildren: true
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

  // Get child files for a specific folder
  getChildFiles(folderPath: string): AtMenuItem[] {
    const childFiles: AtMenuItem[] = [];
    
    // Get files from IDE
    const files = this.editorEngine?.ide?.files || [];
    
    console.log('AtMenu getChildFiles: folderPath:', folderPath, 'files:', files);
    
    if (files.length > 0) {
      // Filter files that are direct children of the specified folder
      files.forEach((filePath: string) => {
        // Skip directories (they end with /)
        if (filePath.endsWith('/')) {
          return;
        }
        
        // Check if this file is a direct child of the folder
        const normalizedFolderPath = folderPath.endsWith('/') ? folderPath : folderPath + '/';
        if (filePath.startsWith(normalizedFolderPath)) {
          // Get the relative path from the folder
          const relativePath = filePath.substring(normalizedFolderPath.length);
          
          // Only include direct children (not nested files)
          if (!relativePath.includes('/')) {
            const fileName = relativePath;
            if (fileName) {
              childFiles.push({
                id: `child-${filePath}`,
                type: 'file',
                name: fileName,
                path: filePath,
                category: 'files',
                icon: getFileIconString(fileName)
              });
            }
          }
        }
      });
    }

    // Sort alphabetically
    childFiles.sort((a, b) => a.name.localeCompare(b.name));
    
    console.log('AtMenu getChildFiles: returning items:', childFiles);
    return childFiles;
  }

  // Get child folders for a specific folder
  getChildFolders(folderPath: string): AtMenuItem[] {
    const childFolders: AtMenuItem[] = [];
    
    // Get directories from sandbox
    const directories = this.editorEngine?.sandbox?.directories || [];
    
    console.log('AtMenu getChildFolders: folderPath:', folderPath, 'directories:', directories);
    
    if (directories.length > 0) {
      // Filter directories that are direct children of the specified folder
      directories.forEach((dirPath: string) => {
        // Skip root directory
        if (dirPath === '/' || dirPath === './') {
          return;
        }
        
        // Check if this directory is a direct child of the folder
        const normalizedFolderPath = folderPath.endsWith('/') ? folderPath : folderPath + '/';
        if (dirPath.startsWith(normalizedFolderPath)) {
          // Get the relative path from the folder
          const relativePath = dirPath.substring(normalizedFolderPath.length);
          
          // Only include direct children (not nested directories)
          if (!relativePath.includes('/')) {
            const folderName = relativePath;
            if (folderName) {
              childFolders.push({
                id: `child-folder-${dirPath}`,
                type: 'folder',
                name: folderName,
                path: dirPath,
                category: 'files',
                icon: 'directory',
                hasChildren: true
              });
            }
          }
        }
      });
    }

    // Sort alphabetically
    childFolders.sort((a, b) => a.name.localeCompare(b.name));
    
    console.log('AtMenu getChildFolders: returning items:', childFolders);
    return childFolders;
  }

  // Get all child items (files and folders) for a specific folder
  getChildItems(folderPath: string): AtMenuItem[] {
    const childFolders = this.getChildFolders(folderPath);
    const childFiles = this.getChildFiles(folderPath);
    
    // Combine and sort alphabetically
    const combined = [...childFolders, ...childFiles];
    combined.sort((a, b) => a.name.localeCompare(b.name));
    
    console.log('AtMenu getChildItems: returning items:', combined);
    return combined;
  }

  // Get brand child items (Colors and Typography)
  getBrandChildItems(): AtMenuItem[] {
    const brandChildItems: AtMenuItem[] = [
      {
        id: 'brand-colors',
        type: 'tab',
        name: 'Colors',
        path: '/brand/colors',
        category: 'leftPanel',
        icon: 'palette',
        hasChildren: true
      },
      {
        id: 'brand-typography',
        type: 'tab',
        name: 'Typography',
        path: '/brand/typography',
        category: 'leftPanel',
        icon: 'type',
        hasChildren: true
      }
    ];

    console.log('AtMenu getBrandChildItems: returning items:', brandChildItems);
    return brandChildItems;
  }

  // Child items for Brand -> Colors
  getBrandColorsChildItems(): AtMenuItem[] {
    const items: AtMenuItem[] = [
      {
        id: 'brand-colors-primary',
        type: 'file',
        name: 'Primary Colors',
        path: '/brand/colors/primary',
        category: 'leftPanel',
        icon: 'palette',
        swatches: [
          { color: '#FF8A00', name: 'tangerine-primary-cta' },
          { color: '#7CD3FF', name: 'sky-primary-info' },
          { color: '#FFD233', name: 'sun-primary-warn' },
          { color: '#C875FF', name: 'orchid-primary-accent' }
        ]
      },
      {
        id: 'brand-colors-secondary',
        type: 'file',
        name: 'Secondary Colors',
        path: '/brand/colors/secondary',
        category: 'leftPanel',
        icon: 'palette',
        swatches: [
          { color: '#1EC8FF', name: 'aqua-secondary' },
          { color: '#10B60E', name: 'leaf-secondary' },
          { color: '#E2A7FF', name: 'lavender-secondary' },
          { color: '#8A0011', name: 'crimson-secondary' }
        ]
      }
    ];
    console.log('AtMenu getBrandColorsChildItems: returning items:', items);
    return items;
  }

  // Child items for Brand -> Typography
  getBrandTypographyChildItems(): AtMenuItem[] {
    const items: AtMenuItem[] = [
      {
        id: 'brand-typography-helvetica',
        type: 'file',
        name: 'Helvetica',
        path: '/brand/typography/helvetica',
        category: 'leftPanel',
        icon: 'type'
      }
    ];
    console.log('AtMenu getBrandTypographyChildItems: returning items:', items);
    return items;
  }

  // Get pages child items from the pages manager
  getPagesChildItems(): AtMenuItem[] {
    const pageItems: AtMenuItem[] = [];
    
    // Get pages from the editor engine's pages manager
    const pages = this.editorEngine?.pages?.tree || [];
    
    console.log('AtMenu getPagesChildItems: pages:', pages);
    
    if (pages.length > 0) {
      // Convert PageNode objects to AtMenuItem objects
      pages.forEach((pageNode: any) => {
        // Skip folder nodes (nodes with children)
        if (pageNode.children && pageNode.children.length > 0) {
          return;
        }
        
        // Create AtMenuItem from PageNode
        pageItems.push({
          id: `page-${pageNode.path}`,
          type: 'file',
          name: pageNode.name || pageNode.path,
          path: pageNode.path,
          category: 'leftPanel',
          icon: 'file'
        });
      });
    }

    // Sort alphabetically
    pageItems.sort((a, b) => a.name.localeCompare(b.name));
    
    console.log('AtMenu getPagesChildItems: returning items:', pageItems);
    return pageItems;
  }

  // Get images child items from the images section
  getImagesChildItems(): AtMenuItem[] {
    const imageItems: AtMenuItem[] = [];
    
    // Get image files from the sandbox
    const files = this.editorEngine?.sandbox?.files || [];
    
    console.log('AtMenu getImagesChildItems: files:', files);
    
    if (files.length > 0) {
      // Filter for image files and create items with thumbnails
      files.forEach((filePath: string) => {
        // Skip directories (they end with /)
        if (filePath.endsWith('/')) {
          return;
        }
        
        // Check if this is an image file
        const fileName = filePath.split('/').pop() || '';
        if (fileName && this.isImageFile(fileName)) {
          // Generate proper image URL for thumbnail
          const imageUrl = this.generateImageUrl(filePath);
          
          imageItems.push({
            id: `image-${filePath}`,
            type: 'file',
            name: fileName,
            path: filePath,
            category: 'files',
            icon: 'image',
            thumbnail: imageUrl
          });
        }
      });
    }

    // Sort alphabetically
    imageItems.sort((a, b) => a.name.localeCompare(b.name));
    
    console.log('AtMenu getImagesChildItems: returning items:', imageItems);
    return imageItems;
  }

  // Generate proper image URL for thumbnail display
  private generateImageUrl(filePath: string): string {
    // Get the sandbox URL from the editor engine
    const sandboxUrl = this.editorEngine?.sandbox?.session?.session?.url;
    
    if (!sandboxUrl) {
      console.warn('No sandbox URL available for image thumbnail');
      return '';
    }
    
    // Convert file path to URL path (remove leading ./ if present)
    const cleanPath = filePath.replace(/^\.\//, '');
    
    // Construct the full URL
    const imageUrl = `${sandboxUrl}/${cleanPath}`;
    
    console.log('Generated image URL:', imageUrl);
    return imageUrl;
  }

  // Helper function to determine if a file is an image file
  private isImageFile(filename: string): boolean {
    if (!filename || typeof filename !== 'string') {
      return false;
    }
    
    const extension = filename.split('.').pop()?.toLowerCase();
    
    // Define image file extensions
    const imageExtensions = [
      'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico', 'tiff', 'tif'
    ];
    
    return imageExtensions.includes(extension || '');
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
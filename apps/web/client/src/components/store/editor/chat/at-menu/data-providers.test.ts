import { AtMenuDataProviders } from './data-providers';

describe('AtMenuDataProviders', () => {
  let dataProviders: AtMenuDataProviders;
  let mockEditorEngine: any;

  beforeEach(() => {
    mockEditorEngine = {
      ide: {
        files: [
          'package.json',
          'README.md',
          'src/index.ts',
          'src/components/Button.tsx',
          'public/logo.png',
          'styles.css'
        ]
      },
      sandbox: {
        directories: [
          'src',
          'src/components',
          'src/utils',
          'public',
          'public/assets',
          'docs'
        ]
      }
    };

    dataProviders = new AtMenuDataProviders(mockEditorEngine);
  });

  describe('getFolders', () => {
    it('should return folders from sandbox directories', () => {
      const folders = dataProviders.getFolders();
      
      expect(folders).toHaveLength(6);
      expect(folders[0]).toEqual({
        id: 'folder-src',
        type: 'folder',
        name: 'src',
        path: 'src',
        category: 'files',
        icon: 'directory',
        hasChildren: true
      });
      expect(folders[1]).toEqual({
        id: 'folder-src/components',
        type: 'folder',
        name: 'components',
        path: 'src/components',
        category: 'files',
        icon: 'directory',
        hasChildren: true
      });
    });

    it('should skip root directory', () => {
      mockEditorEngine.sandbox.directories = ['/', './', 'src', 'public'];
      const folders = dataProviders.getFolders();
      
      expect(folders).toHaveLength(2);
      expect(folders.map(f => f.name)).toEqual(['src', 'public']);
    });

    it('should return empty array when no directories', () => {
      mockEditorEngine.sandbox.directories = [];
      const folders = dataProviders.getFolders();
      
      expect(folders).toHaveLength(0);
    });
  });

  describe('getFoldersAndFiles', () => {
    it('should combine folders and files and sort alphabetically', () => {
      const items = dataProviders.getFoldersAndFiles();
      
      // Should have folders + files (6 folders + 6 files = 12 items)
      expect(items).toHaveLength(12);
      
      // Should be sorted alphabetically
      const names = items.map(item => item.name);
      expect(names).toEqual([
        'assets',      // folder
        'Button.tsx',  // file
        'components',  // folder
        'docs',        // folder
        'index.ts',    // file
        'logo.png',    // file
        'package.json', // file
        'public',      // folder
        'README.md',   // file
        'src',         // folder
        'styles.css',  // file
        'utils'        // folder
      ]);
    });

    it('should handle empty directories and files', () => {
      mockEditorEngine.sandbox.directories = [];
      mockEditorEngine.ide.files = [];
      
      const items = dataProviders.getFoldersAndFiles();
      
      // Should still return fallback items
      expect(items.length).toBeGreaterThan(0);
    });
  });

  describe('getFiles', () => {
    it('should return only non-code files', () => {
      const files = dataProviders.getFiles();
      
      // Should only include non-code files (logo.png, README.md)
      const fileNames = files.map(f => f.name);
      expect(fileNames).toContain('logo.png');
      expect(fileNames).toContain('README.md');
      expect(fileNames).not.toContain('package.json'); // This is a code file
      expect(fileNames).not.toContain('index.ts');     // This is a code file
    });
  });

  describe('getImagesChildItems', () => {
    it('should return image files with thumbnails', () => {
      // Add image files to the mock
      mockEditorEngine.sandbox.files = [
        'public/logo.png',
        'public/banner.jpg',
        'public/icon.svg',
        'src/components/Button.tsx', // Non-image file
        'styles.css' // Non-image file
      ];

      const imageItems = dataProviders.getImagesChildItems();
      
      expect(imageItems).toHaveLength(3);
      
      // Check that only image files are returned
      const fileNames = imageItems.map(item => item.name);
      expect(fileNames).toContain('logo.png');
      expect(fileNames).toContain('banner.jpg');
      expect(fileNames).toContain('icon.svg');
      expect(fileNames).not.toContain('Button.tsx');
      expect(fileNames).not.toContain('styles.css');
      
      // Check that all items have thumbnail property
      imageItems.forEach(item => {
        expect(item.type).toBe('file');
        expect(item.icon).toBe('image');
        expect(item.thumbnail).toBeDefined();
        expect(item.category).toBe('files');
      });
    });

    it('should handle empty files array', () => {
      mockEditorEngine.sandbox.files = [];
      
      const imageItems = dataProviders.getImagesChildItems();
      
      expect(imageItems).toHaveLength(0);
    });

    it('should filter out directories', () => {
      mockEditorEngine.sandbox.files = [
        'public/',
        'public/images/',
        'public/logo.png',
        'public/banner.jpg'
      ];

      const imageItems = dataProviders.getImagesChildItems();
      
      expect(imageItems).toHaveLength(2);
      const fileNames = imageItems.map(item => item.name);
      expect(fileNames).toContain('logo.png');
      expect(fileNames).toContain('banner.jpg');
    });

    it('should sort items alphabetically', () => {
      mockEditorEngine.sandbox.files = [
        'public/zebra.png',
        'public/alpha.jpg',
        'public/beta.gif'
      ];

      const imageItems = dataProviders.getImagesChildItems();
      
      const fileNames = imageItems.map(item => item.name);
      expect(fileNames).toEqual(['alpha.jpg', 'beta.gif', 'zebra.png']);
    });
  });

  describe('getPagesChildItems', () => {
    it('should return pages from the pages manager', () => {
      // Mock pages data
      mockEditorEngine.pages = {
        tree: [
          {
            id: 'page-1',
            name: 'Home',
            path: '/',
            children: []
          },
          {
            id: 'page-2',
            name: 'About',
            path: '/about',
            children: []
          },
          {
            id: 'page-3',
            name: 'Contact',
            path: '/contact',
            children: []
          },
          {
            id: 'page-4',
            name: 'Blog',
            path: '/blog',
            children: [
              { id: 'page-5', name: 'Post 1', path: '/blog/post-1', children: [] }
            ]
          }
        ]
      };

      const pageItems = dataProviders.getPagesChildItems();
      
      expect(pageItems).toHaveLength(3); // Should only include pages without children
      
      // Check that only pages without children are returned
      const pageNames = pageItems.map(item => item.name);
      expect(pageNames).toContain('Home');
      expect(pageNames).toContain('About');
      expect(pageNames).toContain('Contact');
      expect(pageNames).not.toContain('Blog'); // Blog has children, so it should be excluded
      
      // Check that all items have correct properties
      pageItems.forEach(item => {
        expect(item.type).toBe('file');
        expect(item.icon).toBe('file');
        expect(item.category).toBe('leftPanel');
        expect(item.path).toBeDefined();
      });
    });

    it('should handle empty pages array', () => {
      mockEditorEngine.pages = {
        tree: []
      };
      
      const pageItems = dataProviders.getPagesChildItems();
      
      expect(pageItems).toHaveLength(0);
    });

    it('should sort items alphabetically', () => {
      mockEditorEngine.pages = {
        tree: [
          {
            id: 'page-1',
            name: 'Zebra',
            path: '/zebra',
            children: []
          },
          {
            id: 'page-2',
            name: 'Alpha',
            path: '/alpha',
            children: []
          },
          {
            id: 'page-3',
            name: 'Beta',
            path: '/beta',
            children: []
          }
        ]
      };

      const pageItems = dataProviders.getPagesChildItems();
      
      const pageNames = pageItems.map(item => item.name);
      expect(pageNames).toEqual(['Alpha', 'Beta', 'Zebra']);
    });

    it('should handle missing pages manager', () => {
      mockEditorEngine.pages = undefined;
      
      const pageItems = dataProviders.getPagesChildItems();
      
      expect(pageItems).toHaveLength(0);
    });
  });
}); 
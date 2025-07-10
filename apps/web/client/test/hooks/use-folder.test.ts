import { describe, expect, mock, test } from 'bun:test';
import type { FolderNode } from '@onlook/models';
import { 
    createBaseFolder,
    createFolderNode,
    validateFolderRename,
    validateFolderMove,
    validateFolderCreate,
    generateNewFolderPath,
    getFolderName,
    getParentPath,
    isChildPath,
    normalizePath
} from '@onlook/utility';

describe('useFolder hook logic', () => {
    describe('createBaseFolder', () => {
        test('should create empty root folder when no images provided', () => {
            const rootFolder = createBaseFolder([]);
            
            expect(rootFolder.name).toBe('public');
            expect(rootFolder.fullPath).toBe('public');
            expect(rootFolder.images).toEqual([]);
            expect(rootFolder.children?.size).toBe(0);
        });

        test('should create folder structure from image paths', () => {
            const imagePaths = [
                'public/images/photo1.jpg',
                'public/images/photo2.jpg',
                'public/icons/icon1.png',
                'public/logo.svg'
            ];
            
            const rootFolder = createBaseFolder(imagePaths);
            
            expect(rootFolder.name).toBe('public');
            expect(rootFolder.images).toContain('public/logo.svg');
            expect(rootFolder.children?.has('images')).toBe(true);
            expect(rootFolder.children?.has('icons')).toBe(true);
            
            const imagesFolder = rootFolder.children?.get('images')!;
            expect(imagesFolder.images).toContain('public/images/photo1.jpg');
            expect(imagesFolder.images).toContain('public/images/photo2.jpg');
            
            const iconsFolder = rootFolder.children?.get('icons')!;
            expect(iconsFolder.images).toContain('public/icons/icon1.png');
        });

        test('should handle nested folder structures', () => {
            const imagePaths = [
                'public/assets/images/gallery/photo1.jpg',
                'public/assets/images/gallery/photo2.jpg',
                'public/assets/icons/social/facebook.svg'
            ];
            
            const rootFolder = createBaseFolder(imagePaths);
            
            const assetsFolder = rootFolder.children?.get('assets')!;
            expect(assetsFolder).toBeDefined();
            
            const imagesFolder = assetsFolder.children?.get('images')!;
            expect(imagesFolder).toBeDefined();
            
            const galleryFolder = imagesFolder.children?.get('gallery')!;
            expect(galleryFolder).toBeDefined();
            expect(galleryFolder.images).toContain('public/assets/images/gallery/photo1.jpg');
        });

        test('should ignore empty path parts', () => {
            const imagePaths = [
                'public//images//photo1.jpg', // Double slashes
                'public/images/photo2.jpg'
            ];
            
            const rootFolder = createBaseFolder(imagePaths);
            
            const imagesFolder = rootFolder.children?.get('images')!;
            expect(imagesFolder.images).toContain('public//images//photo1.jpg');
            expect(imagesFolder.images).toContain('public/images/photo2.jpg');
        });

        test('should handle root level images', () => {
            const imagePaths = [
                'public/favicon.ico',
                'public/logo.png'
            ];
            
            const rootFolder = createBaseFolder(imagePaths);
            
            expect(rootFolder.images).toContain('public/favicon.ico');
            expect(rootFolder.images).toContain('public/logo.png');
        });

        test('should handle images with no path prefix', () => {
            const imagePaths = [
                'image1.jpg',
                'image2.png'
            ];
            
            const rootFolder = createBaseFolder(imagePaths);
            
            expect(rootFolder.images).toContain('image1.jpg');
            expect(rootFolder.images).toContain('image2.png');
        });

        test('should handle null image paths', () => {
            const imagePaths = [
                'public/image1.jpg',
                null as any, // Invalid path
                'public/image2.jpg'
            ];
            
            const rootFolder = createBaseFolder(imagePaths);
            
            expect(rootFolder.images).toContain('public/image1.jpg');
            expect(rootFolder.images).toContain('public/image2.jpg');
            expect(rootFolder.images).not.toContain(null);
        });

        test('should handle empty string image paths', () => {
            const imagePaths = [
                'public/image1.jpg',
                '', // Empty string
                'public/image2.jpg'
            ];
            
            const rootFolder = createBaseFolder(imagePaths);
            
            expect(rootFolder.images).toContain('public/image1.jpg');
            expect(rootFolder.images).toContain('public/image2.jpg');
            // Empty string should be filtered out by the logic
        });

        test('should handle complex nested paths', () => {
            const imagePaths = [
                'public/very/deep/nested/folder/structure/image.jpg',
                'public/another/deep/path/image.png'
            ];
            
            const rootFolder = createBaseFolder(imagePaths);
            
            const veryFolder = rootFolder.children?.get('very')!;
            expect(veryFolder).toBeDefined();
            
            const deepFolder = veryFolder.children?.get('deep')!;
            expect(deepFolder).toBeDefined();
            
            // Navigate to the deepest level
            let current = deepFolder;
            const pathSegments = ['nested', 'folder', 'structure'];
            
            for (const segment of pathSegments) {
                current = current.children?.get(segment)!;
                expect(current).toBeDefined();
            }
            
            expect(current.images).toContain('public/very/deep/nested/folder/structure/image.jpg');
        });

        test('should handle the root folder duplication issue', () => {
            const rootFolder = createBaseFolder(['public/image.jpg']);
            
            expect(rootFolder.name).toBe('public');
            expect(rootFolder.fullPath).toBe('');
            
            expect(rootFolder.children?.has('public')).toBe(false);
            expect(rootFolder.images).toContain('public/image.jpg');
        });

        test('should always create consistent structure even with no images', () => {
            const rootFolder = createBaseFolder([]);
            
            expect(rootFolder.name).toBe('public');
            expect(rootFolder.fullPath).toBe('');
            expect(rootFolder.children?.size).toBe(0);
        });
    });

    describe('folder rename validation', () => {
        test('should validate empty folder name', () => {
            const result = validateFolderRename('public/test-folder', '   ');
            
            expect(result.isValid).toBe(false);
            expect(result.error).toBe('Folder name cannot be empty');
        });

        test('should validate unchanged folder name', () => {
            const result = validateFolderRename('public/test-folder', 'test-folder');
            
            expect(result.isValid).toBe(false);
            expect(result.error).toBe('Name unchanged');
        });

        test('should validate successful rename', () => {
            const result = validateFolderRename('public/old-name', 'new-name');
            
            expect(result.isValid).toBe(true);
            expect(result.newPath).toBe('public/new-name');
        });

        test('should handle rename with nested path', () => {
            const result = validateFolderRename('public/parent/subfolder', 'new-subfolder');
            
            expect(result.isValid).toBe(true);
            expect(result.newPath).toBe('public/parent/new-subfolder');
        });

        test('should handle rename with root path', () => {
            const result = validateFolderRename('folder', 'new-folder');
            
            expect(result.isValid).toBe(true);
            expect(result.newPath).toBe('new-folder');
        });
    });

    describe('folder move validation', () => {
        test('should validate required parameters', () => {
            const result = validateFolderMove('', 'public/target');
            
            expect(result.isValid).toBe(false);
            expect(result.error).toBe('Please select a target folder');
        });

        test('should prevent moving folder into itself', () => {
            const result = validateFolderMove('public/parent', 'public/parent/child');
            
            expect(result.isValid).toBe(false);
            expect(result.error).toBe('Cannot move folder into itself or its children');
        });

        test('should prevent moving folder into exact same path', () => {
            const result = validateFolderMove('public/folder', 'public/folder');
            
            expect(result.isValid).toBe(false);
            expect(result.error).toBe('Cannot move folder into itself or its children');
        });

        test('should validate successful move', () => {
            const result = validateFolderMove('public/source', 'public/target');
            
            expect(result.isValid).toBe(true);
            expect(result.newPath).toBe('public/target/source');
        });

        test('should handle move to root folder', () => {
            const result = validateFolderMove('public/nested/source', '');
            
            expect(result.isValid).toBe(true);
            expect(result.newPath).toBe('source');
        });
    });

    describe('folder creation validation', () => {
        test('should validate empty folder name', () => {
            const result = validateFolderCreate('   ');
            
            expect(result.isValid).toBe(false);
            expect(result.error).toBe('Folder name cannot be empty');
        });

        test('should validate successful creation', () => {
            const result = validateFolderCreate('new-folder', 'public/parent');
            
            expect(result.isValid).toBe(true);
            expect(result.newPath).toBe('public/parent/new-folder');
        });

        test('should handle creation in root', () => {
            const result = validateFolderCreate('root-folder');
            
            expect(result.isValid).toBe(true);
            expect(result.newPath).toBe('root-folder');
        });
    });

    describe('utility functions', () => {
        test('should generate correct paths for different operations', () => {
            expect(generateNewFolderPath('public/old', 'new', 'rename')).toBe('public/new');
            expect(generateNewFolderPath('public/folder', 'ignored', 'move', 'public/target')).toBe('public/target/folder');
            expect(generateNewFolderPath('ignored', 'new', 'create', 'public/parent')).toBe('public/parent/new');
        });

        test('should get folder name correctly', () => {
            expect(getFolderName('public/parent/folder')).toBe('folder');
            expect(getFolderName('folder')).toBe('folder');
            expect(getFolderName('')).toBe('');
        });

        test('should get parent path correctly', () => {
            expect(getParentPath('public/parent/folder')).toBe('public/parent');
            expect(getParentPath('folder')).toBe('');
            expect(getParentPath('')).toBe('');
        });

        test('should check child paths correctly', () => {
            expect(isChildPath('public/parent/child', 'public/parent')).toBe(true);
            expect(isChildPath('public/parent', 'public/parent')).toBe(true);
            expect(isChildPath('public/other', 'public/parent')).toBe(false);
        });

        test('should normalize paths correctly', () => {
            expect(normalizePath('public//folder//subfolder')).toBe('public/folder/subfolder');
            expect(normalizePath('//public/folder//')).toBe('public/folder');
            expect(normalizePath('')).toBe('');
        });
    });

    describe('edge cases and error scenarios', () => {
        test('should handle malformed folder paths', () => {
            const imagePaths = [
                'public/normal/path/image.jpg',
                'public///multiple///slashes///image.jpg',
                'public/./weird/./path/image.jpg'
            ];
            
            const rootFolder = createBaseFolder(imagePaths);
            
            // Should still create structure, even with malformed paths
            expect(rootFolder.children?.has('normal')).toBe(true);
            expect(rootFolder.children?.has('multiple')).toBe(true);
            expect(rootFolder.children?.has('.')).toBe(true);
        });

        test('should handle very deep nesting', () => {
            const deepPath = 'public/' + Array(20).fill('level').join('/') + '/image.jpg';
            const rootFolder = createBaseFolder([deepPath]);
            
            let current = rootFolder;
            for (let i = 0; i < 20; i++) {
                current = current.children?.get('level')!;
                expect(current).toBeDefined();
            }
            
            expect(current.images).toContain(deepPath);
        });

        test('should handle folder name validation edge cases', () => {
            // Test whitespace-only names
            expect(validateFolderRename('test', '   ').isValid).toBe(false);
            expect(validateFolderRename('test', '\t\n').isValid).toBe(false);
            
            // Test valid names with spaces
            expect(validateFolderRename('test', 'new folder').isValid).toBe(true);
            expect(validateFolderRename('test', ' trimmed ').newPath).toBe(' trimmed ');
        });

        test('should handle move validation edge cases', () => {
            // Test circular reference prevention
            expect(validateFolderMove('a/b', 'a/b/c/d').isValid).toBe(false);
            expect(validateFolderMove('a/b/c', 'a/b').isValid).toBe(false);
            
            // Test valid moves
            expect(validateFolderMove('a/b', 'c/d').isValid).toBe(true);
            expect(validateFolderMove('folder', 'completely/different/path').isValid).toBe(true);
        });
    });
}); 
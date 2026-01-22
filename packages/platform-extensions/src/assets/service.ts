import type { AssetUploadResult, AssetOptimization, AssetReference } from './types';

export class AssetManagementService {
    private projectAssets: Map<string, any[]> = new Map();

    async uploadAsset(file: File, projectId: string): Promise<AssetUploadResult> {
        try {
            // Validate file
            this.validateFile(file);
            
            // Generate asset ID and paths
            const assetId = `asset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const sanitizedName = this.sanitizeFileName(file.name);
            const extension = this.getFileExtension(file.name);
            
            // Generate storage paths
            const originalPath = `/assets/${projectId}/${assetId}-${sanitizedName}${extension}`;
            const optimizedPath = `/assets/${projectId}/${assetId}-${sanitizedName}-optimized${extension}`;
            const thumbnailPath = `/assets/${projectId}/${assetId}-${sanitizedName}-thumb${extension}`;
            
            // Read file content
            const buffer = await this.fileToBuffer(file);
            
            // Get file metadata
            const metadata = await this.extractMetadata(buffer, file.type);
            
            // Store original file
            const originalUrl = await this.storeFile(buffer, originalPath);
            
            // Create optimized version if needed
            let optimizedUrl: string | undefined;
            if (this.shouldOptimize(file)) {
                const optimizedBuffer = await this.optimizeFile(buffer, file.type);
                optimizedUrl = await this.storeFile(optimizedBuffer, optimizedPath);
            }
            
            // Create thumbnail if it's an image
            let thumbnailUrl: string | undefined;
            if (this.isImage(file.type) && metadata.dimensions) {
                const thumbnailBuffer = await this.createThumbnail(buffer, file.type);
                thumbnailUrl = await this.storeFile(thumbnailBuffer, thumbnailPath);
            }
            
            // Create asset record
            const asset = {
                id: assetId,
                projectId,
                name: sanitizedName,
                originalName: file.name,
                type: this.getAssetType(file.type),
                format: extension.slice(1), // Remove dot
                size: file.size,
                metadata,
                originalPath,
                optimizedPath: optimizedUrl ? optimizedPath : undefined,
                thumbnailPath: thumbnailUrl ? thumbnailPath : undefined,
                url: originalUrl,
                optimizedUrl,
                thumbnailUrl,
                uploadedAt: new Date(),
                references: [],
            };
            
            // Store asset in project assets
            if (!this.projectAssets.has(projectId)) {
                this.projectAssets.set(projectId, []);
            }
            this.projectAssets.get(projectId)!.push(asset);
            
            // Save to database (simulated)
            await this.saveAssetToDatabase(asset);
            
            return {
                id: assetId,
                url: originalUrl,
                path: originalPath,
                optimizedPath: optimizedUrl ? optimizedPath : undefined,
                thumbnailPath: thumbnailUrl ? thumbnailPath : undefined,
            };
        } catch (error) {
            throw new Error(`Asset upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async optimizeAsset(assetId: string, options: AssetOptimization): Promise<string> {
        // Find asset
        const asset = this.findAssetById(assetId);
        if (!asset) {
            throw new Error('Asset not found');
        }
        
        try {
            // Get original file buffer
            const buffer = await this.getFileBuffer(asset.originalPath);
            
            // Apply optimization
            const optimizedBuffer = await this.applyOptimization(buffer, asset.format, options);
            
            // Generate optimized path
            const optimizedPath = asset.originalPath.replace(/(\.[^.]+)$/, `-optimized$1`);
            
            // Store optimized file
            const optimizedUrl = await this.storeFile(optimizedBuffer, optimizedPath);
            
            // Update asset record
            asset.optimizedPath = optimizedPath;
            asset.optimizedUrl = optimizedUrl;
            
            // Save to database (simulated)
            await this.updateAssetInDatabase(asset);
            
            return optimizedUrl;
        } catch (error) {
            throw new Error(`Asset optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async generateImportStatement(assetId: string, filePath: string): Promise<string> {
        const asset = this.findAssetById(assetId);
        if (!asset) {
            throw new Error('Asset not found');
        }
        
        // Calculate relative path from file to asset
        const relativePath = this.calculateRelativePath(filePath, asset.url);
        
        // Generate import statement based on file type and framework
        const importName = this.generateImportName(asset.name);
        
        if (this.isImage(asset.type)) {
            return `import ${importName} from '${relativePath}';`;
        } else {
            return `import '${relativePath}';`;
        }
    }

    async updateAssetReferences(assetId: string): Promise<AssetReference[]> {
        const asset = this.findAssetById(assetId);
        if (!asset) {
            throw new Error('Asset not found');
        }
        
        // This would scan the project files to find references to this asset
        // For now, return the stored references
        return asset.references || [];
    }

    /**
     * Get assets for a project
     */
    async getProjectAssets(projectId: string): Promise<any[]> {
        return this.projectAssets.get(projectId) || [];
    }

    /**
     * Delete asset
     */
    async deleteAsset(assetId: string): Promise<void> {
        const asset = this.findAssetById(assetId);
        if (!asset) {
            throw new Error('Asset not found');
        }
        
        // Remove files from storage
        await this.deleteFile(asset.originalPath);
        if (asset.optimizedPath) {
            await this.deleteFile(asset.optimizedPath);
        }
        if (asset.thumbnailPath) {
            await this.deleteFile(asset.thumbnailPath);
        }
        
        // Remove from project assets
        const projectAssets = this.projectAssets.get(asset.projectId);
        if (projectAssets) {
            const index = projectAssets.findIndex(a => a.id === assetId);
            if (index !== -1) {
                projectAssets.splice(index, 1);
            }
        }
        
        // Delete from database (simulated)
        await this.deleteAssetFromDatabase(assetId);
    }

    /**
     * Organize assets into folders
     */
    async organizeAssets(projectId: string, assetIds: string[], folderName: string): Promise<void> {
        const assets = assetIds.map(id => this.findAssetById(id)).filter(Boolean);
        
        for (const asset of assets) {
            if (asset) {
                asset.folder = folderName;
                await this.updateAssetInDatabase(asset);
            }
        }
    }

    /**
     * Validate uploaded file
     */
    private validateFile(file: File): void {
        const maxSize = 50 * 1024 * 1024; // 50MB
        const allowedTypes = [
            'image/jpeg', 'image/png', 'image/gif', 'image/svg+xml', 'image/webp',
            'video/mp4', 'video/webm',
            'application/pdf',
            'text/css', 'text/javascript',
        ];
        
        if (file.size > maxSize) {
            throw new Error('File size exceeds 50MB limit');
        }
        
        if (!allowedTypes.includes(file.type)) {
            throw new Error(`File type ${file.type} is not supported`);
        }
    }

    /**
     * Convert File to Buffer
     */
    private async fileToBuffer(file: File): Promise<Buffer> {
        const arrayBuffer = await file.arrayBuffer();
        return Buffer.from(arrayBuffer);
    }

    /**
     * Extract file metadata
     */
    private async extractMetadata(buffer: Buffer, mimeType: string): Promise<any> {
        const metadata: any = {};
        
        if (this.isImage(mimeType)) {
            metadata.dimensions = await this.getImageDimensions(buffer, mimeType);
        }
        
        return metadata;
    }

    /**
     * Get image dimensions
     */
    private async getImageDimensions(buffer: Buffer, mimeType: string): Promise<{ width: number; height: number } | undefined> {
        // This would use an image processing library
        // For now, return placeholder dimensions
        return { width: 800, height: 600 };
    }

    /**
     * Check if file should be optimized
     */
    private shouldOptimize(file: File): boolean {
        const optimizableTypes = ['image/jpeg', 'image/png', 'image/webp'];
        return optimizableTypes.includes(file.type) && file.size > 100 * 1024; // > 100KB
    }

    /**
     * Optimize file
     */
    private async optimizeFile(buffer: Buffer, mimeType: string): Promise<Buffer> {
        // This would use image optimization libraries
        // For now, return the original buffer
        return buffer;
    }

    /**
     * Create thumbnail
     */
    private async createThumbnail(buffer: Buffer, mimeType: string): Promise<Buffer> {
        // This would create a thumbnail using image processing
        // For now, return the original buffer
        return buffer;
    }

    /**
     * Store file (simulated)
     */
    private async storeFile(buffer: Buffer, path: string): Promise<string> {
        // This would upload to cloud storage or save locally
        console.log(`Storing file at ${path}, size: ${buffer.length} bytes`);
        
        // Return public URL
        return `https://assets.onlook.com${path}`;
    }

    /**
     * Get file buffer (simulated)
     */
    private async getFileBuffer(path: string): Promise<Buffer> {
        // This would retrieve from storage
        console.log(`Retrieving file from ${path}`);
        return Buffer.alloc(0);
    }

    /**
     * Delete file (simulated)
     */
    private async deleteFile(path: string): Promise<void> {
        console.log(`Deleting file at ${path}`);
    }

    /**
     * Apply optimization options
     */
    private async applyOptimization(buffer: Buffer, format: string, options: AssetOptimization): Promise<Buffer> {
        // This would apply the optimization options
        console.log(`Applying optimization: ${JSON.stringify(options)}`);
        return buffer;
    }

    /**
     * Utility methods
     */
    private sanitizeFileName(name: string): string {
        return name.replace(/[^a-zA-Z0-9.-]/g, '-').toLowerCase();
    }

    private getFileExtension(name: string): string {
        return name.substring(name.lastIndexOf('.'));
    }

    private getAssetType(mimeType: string): string {
        if (mimeType.startsWith('image/')) return 'image';
        if (mimeType.startsWith('video/')) return 'video';
        if (mimeType === 'application/pdf') return 'document';
        return 'file';
    }

    private isImage(type: string): boolean {
        if (!type) return false;
        return type.startsWith('image/') || type === 'image';
    }

    private findAssetById(assetId: string): any | undefined {
        for (const assets of this.projectAssets.values()) {
            const asset = assets.find(a => a.id === assetId);
            if (asset) return asset;
        }
        return undefined;
    }

    private calculateRelativePath(fromPath: string, toPath: string): string {
        // Simple relative path calculation
        return toPath;
    }

    private generateImportName(assetName: string): string {
        return assetName.replace(/[^a-zA-Z0-9]/g, '').replace(/^[0-9]/, 'Asset$&') || 'Asset';
    }

    /**
     * Database operations (simulated)
     */
    private async saveAssetToDatabase(asset: any): Promise<void> {
        console.log(`Saving asset ${asset.id} to database`);
    }

    private async updateAssetInDatabase(asset: any): Promise<void> {
        console.log(`Updating asset ${asset.id} in database`);
    }

    private async deleteAssetFromDatabase(assetId: string): Promise<void> {
        console.log(`Deleting asset ${assetId} from database`);
    }
}
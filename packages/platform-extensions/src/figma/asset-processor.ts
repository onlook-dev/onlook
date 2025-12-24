import type { FigmaAsset } from './types';

/**
 * Asset processor for optimizing and storing Figma assets
 */
export class FigmaAssetProcessor {
    private projectId: string;
    private storageBasePath: string;

    constructor(projectId: string, storageBasePath: string = '/assets') {
        this.projectId = projectId;
        this.storageBasePath = storageBasePath;
    }

    /**
     * Process and optimize assets from Figma
     */
    async processAssets(assets: FigmaAsset[]): Promise<ProcessedAsset[]> {
        const processedAssets: ProcessedAsset[] = [];

        for (const asset of assets) {
            try {
                const processed = await this.processAsset(asset);
                processedAssets.push(processed);
            } catch (error) {
                console.error(`Failed to process asset ${asset.id}:`, error);
                // Continue with other assets
            }
        }

        return processedAssets;
    }

    /**
     * Process a single asset
     */
    private async processAsset(asset: FigmaAsset): Promise<ProcessedAsset> {
        // Download the asset
        const buffer = await this.downloadAsset(asset.url);
        
        // Determine file info
        const fileInfo = this.getFileInfo(asset, buffer);
        
        // Optimize the asset
        const optimized = await this.optimizeAsset(buffer, asset.format, fileInfo);
        
        // Generate storage paths
        const paths = this.generateStoragePaths(asset, fileInfo);
        
        // Store the assets
        await this.storeAsset(optimized.original, paths.original);
        
        let optimizedPath: string | undefined;
        if (optimized.optimized) {
            optimizedPath = paths.optimized;
            await this.storeAsset(optimized.optimized, optimizedPath);
        }

        let thumbnailPath: string | undefined;
        if (optimized.thumbnail) {
            thumbnailPath = paths.thumbnail;
            await this.storeAsset(optimized.thumbnail, thumbnailPath);
        }

        return {
            id: asset.id,
            name: asset.name,
            type: asset.type,
            format: fileInfo.format,
            size: buffer.length,
            dimensions: fileInfo.dimensions,
            originalPath: paths.original,
            optimizedPath,
            thumbnailPath,
            url: this.generatePublicUrl(paths.original),
            optimizedUrl: optimizedPath ? this.generatePublicUrl(optimizedPath) : undefined,
            thumbnailUrl: thumbnailPath ? this.generatePublicUrl(thumbnailPath) : undefined,
        };
    }

    /**
     * Download asset from Figma URL
     */
    private async downloadAsset(url: string): Promise<Buffer> {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to download asset: ${response.statusText}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
    }

    /**
     * Get file information from buffer
     */
    private getFileInfo(asset: FigmaAsset, buffer: Buffer): FileInfo {
        const format = this.detectFormat(buffer) || asset.format;
        const dimensions = this.extractDimensions(buffer, format);
        
        return {
            format,
            dimensions,
            size: buffer.length,
        };
    }

    /**
     * Detect file format from buffer
     */
    private detectFormat(buffer: Buffer): string | null {
        // PNG signature
        if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))) {
            return 'png';
        }
        
        // JPEG signature
        if (buffer.length >= 2 && buffer[0] === 0xFF && buffer[1] === 0xD8) {
            return 'jpg';
        }
        
        // SVG signature
        if (buffer.toString('utf8', 0, 100).includes('<svg')) {
            return 'svg';
        }
        
        return null;
    }

    /**
     * Extract image dimensions from buffer
     */
    private extractDimensions(buffer: Buffer, format: string): { width: number; height: number } | undefined {
        try {
            switch (format) {
                case 'png':
                    return this.extractPngDimensions(buffer);
                case 'jpg':
                case 'jpeg':
                    return this.extractJpegDimensions(buffer);
                case 'svg':
                    return this.extractSvgDimensions(buffer);
                default:
                    return undefined;
            }
        } catch {
            return undefined;
        }
    }

    /**
     * Extract PNG dimensions
     */
    private extractPngDimensions(buffer: Buffer): { width: number; height: number } {
        // PNG IHDR chunk starts at byte 16
        const width = buffer.readUInt32BE(16);
        const height = buffer.readUInt32BE(20);
        return { width, height };
    }

    /**
     * Extract JPEG dimensions (simplified)
     */
    private extractJpegDimensions(buffer: Buffer): { width: number; height: number } {
        // This is a simplified JPEG parser
        // In production, use a proper image library
        let offset = 2;
        
        while (offset < buffer.length - 1) {
            if (buffer[offset] === 0xFF) {
                const marker = buffer[offset + 1];
                
                if (marker === undefined) {
                    break;
                }
                
                // SOF markers
                if ((marker >= 0xC0 && marker <= 0xC3) || (marker >= 0xC5 && marker <= 0xC7) || 
                    (marker >= 0xC9 && marker <= 0xCB) || (marker >= 0xCD && marker <= 0xCF)) {
                    if (offset + 7 < buffer.length) {
                        const height = buffer.readUInt16BE(offset + 5);
                        const width = buffer.readUInt16BE(offset + 7);
                        return { width, height };
                    }
                }
                
                // Skip to next marker
                if (offset + 3 < buffer.length) {
                    const length = buffer.readUInt16BE(offset + 2);
                    offset += 2 + length;
                } else {
                    break;
                }
            } else {
                offset++;
            }
        }
        
        throw new Error('Could not extract JPEG dimensions');
    }

    /**
     * Extract SVG dimensions
     */
    private extractSvgDimensions(buffer: Buffer): { width: number; height: number } {
        const svgContent = buffer.toString('utf8');
        
        // Try to extract from width/height attributes
        const widthMatch = svgContent.match(/width=["\']([^"\']+)["\']/) || svgContent.match(/width="([^"]+)"/);
        const heightMatch = svgContent.match(/height=["\']([^"\']+)["\']/) || svgContent.match(/height="([^"]+)"/);
        
        if (widthMatch?.[1] && heightMatch?.[1]) {
            const width = parseFloat(widthMatch[1]);
            const height = parseFloat(heightMatch[1]);
            
            if (!isNaN(width) && !isNaN(height)) {
                return { width, height };
            }
        }
        
        // Try to extract from viewBox
        const viewBoxMatch = svgContent.match(/viewBox=["\']([^"\']+)["\']/) || svgContent.match(/viewBox="([^"]+)"/);
        if (viewBoxMatch?.[1]) {
            const values = viewBoxMatch[1].split(/\s+/);
            if (values.length === 4 && values[2] && values[3]) {
                const width = parseFloat(values[2]);
                const height = parseFloat(values[3]);
                
                if (!isNaN(width) && !isNaN(height)) {
                    return { width, height };
                }
            }
        }
        
        // Default SVG dimensions
        return { width: 100, height: 100 };
    }

    /**
     * Optimize asset based on format and size
     */
    private async optimizeAsset(buffer: Buffer, format: string, fileInfo: FileInfo): Promise<OptimizedAsset> {
        const result: OptimizedAsset = {
            original: buffer,
        };

        // For images, create optimized versions
        if (format === 'png' || format === 'jpg') {
            // In production, use image optimization libraries like sharp
            // For now, we'll just create placeholder optimized versions
            
            if (fileInfo.size > 100 * 1024) { // > 100KB
                result.optimized = await this.createOptimizedVersion(buffer, format);
            }
            
            if (fileInfo.dimensions && (fileInfo.dimensions.width > 200 || fileInfo.dimensions.height > 200)) {
                result.thumbnail = await this.createThumbnail(buffer, format);
            }
        }

        return result;
    }

    /**
     * Create optimized version of image
     */
    private async createOptimizedVersion(buffer: Buffer, _format: string): Promise<Buffer> {
        // Placeholder for image optimization
        // In production, use libraries like sharp to:
        // - Reduce quality for JPEG
        // - Optimize PNG compression
        // - Convert to WebP if supported
        return buffer;
    }

    /**
     * Create thumbnail version of image
     */
    private async createThumbnail(buffer: Buffer, _format: string): Promise<Buffer> {
        // Placeholder for thumbnail creation
        // In production, use libraries like sharp to resize to 200x200
        return buffer;
    }

    /**
     * Generate storage paths for asset
     */
    private generateStoragePaths(asset: FigmaAsset, fileInfo: FileInfo): StoragePaths {
        const sanitizedName = this.sanitizeFileName(asset.name);
        const basePath = `${this.storageBasePath}/${this.projectId}/figma`;
        
        return {
            original: `${basePath}/${asset.id}-${sanitizedName}.${fileInfo.format}`,
            optimized: `${basePath}/${asset.id}-${sanitizedName}-optimized.${fileInfo.format}`,
            thumbnail: `${basePath}/${asset.id}-${sanitizedName}-thumb.${fileInfo.format}`,
        };
    }

    /**
     * Sanitize file name for storage
     */
    private sanitizeFileName(name: string): string {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    }

    /**
     * Store asset to storage system
     */
    private async storeAsset(buffer: Buffer, path: string): Promise<void> {
        // Placeholder for storage implementation
        // In production, this would:
        // - Upload to cloud storage (S3, GCS, etc.)
        // - Store in local file system
        // - Update database records
        console.log(`Storing asset to ${path}, size: ${buffer.length} bytes`);
    }

    /**
     * Generate public URL for asset
     */
    private generatePublicUrl(path: string): string {
        // In production, this would generate proper URLs based on storage system
        return `https://assets.onlook.com${path}`;
    }
}

/**
 * Types for asset processing
 */
export interface ProcessedAsset {
    id: string;
    name: string;
    type: string;
    format: string;
    size: number;
    dimensions?: { width: number; height: number };
    originalPath: string;
    optimizedPath?: string;
    thumbnailPath?: string;
    url: string;
    optimizedUrl?: string;
    thumbnailUrl?: string;
}

interface FileInfo {
    format: string;
    dimensions?: { width: number; height: number };
    size: number;
}

interface OptimizedAsset {
    original: Buffer;
    optimized?: Buffer;
    thumbnail?: Buffer;
}

interface StoragePaths {
    original: string;
    optimized: string;
    thumbnail: string;
}
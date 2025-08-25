import { createClient } from '@/utils/supabase/client';
import { 
    canCompressFile, 
    compressImage, 
    getCompressionOptions,
    type CompressionResult 
} from './image-compression';

// Size limits by file type (in bytes)
const SIZE_LIMITS = {
    // Images - will be compressed if over limit
    images: {
        max: 20 * 1024 * 1024, // 20MB original, will compress to ~2MB
        compressed: 2 * 1024 * 1024, // 2MB after compression
    },
    // Documents
    documents: {
        max: 5 * 1024 * 1024, // 5MB for PDFs and text
    },
    // Videos
    videos: {
        max: 50 * 1024 * 1024, // 50MB for videos
    },
    // Archives
    archives: {
        max: 10 * 1024 * 1024, // 10MB for zip files
    },
    // Total for all files
    total: 100 * 1024 * 1024, // 100MB total
};

const FILE_TYPE_CONFIG = {
    // Images - compressible
    'image/jpeg': { category: 'images', compressible: true },
    'image/jpg': { category: 'images', compressible: true },
    'image/png': { category: 'images', compressible: true },
    'image/webp': { category: 'images', compressible: true },
    'image/bmp': { category: 'images', compressible: true },
    'image/tiff': { category: 'images', compressible: true },
    // Images - non-compressible
    'image/gif': { category: 'images', compressible: false },
    'image/svg+xml': { category: 'images', compressible: false },
    // Documents
    'application/pdf': { category: 'documents', compressible: false },
    'text/plain': { category: 'documents', compressible: false },
    'application/json': { category: 'documents', compressible: false },
    'text/csv': { category: 'documents', compressible: false },
    'application/rtf': { category: 'documents', compressible: false },
    // Archives
    'application/zip': { category: 'archives', compressible: false },
    'application/x-zip-compressed': { category: 'archives', compressible: false },
    'application/x-rar-compressed': { category: 'archives', compressible: false },
    'application/x-7z-compressed': { category: 'archives', compressible: false },
    // Video
    'video/mp4': { category: 'videos', compressible: false },
    'video/webm': { category: 'videos', compressible: false },
    'video/quicktime': { category: 'videos', compressible: false },
    'video/avi': { category: 'videos', compressible: false },
} as const;

const ALLOWED_FILE_TYPES = Object.keys(FILE_TYPE_CONFIG);

export interface AttachmentFile {
    name: string;
    size: number;
    type: string;
    url: string;
    uploadedAt: string;
}

export interface FileValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    needsCompression: boolean;
}

function getFileCategory(file: File): keyof typeof SIZE_LIMITS | null {
    const config = FILE_TYPE_CONFIG[file.type as keyof typeof FILE_TYPE_CONFIG];
    return config?.category || null;
}

export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function validateFile(file: File): FileValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let needsCompression = false;
    
    // Check if file type is allowed
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        errors.push(`File type '${file.type}' is not supported`);
        return { isValid: false, errors, warnings, needsCompression };
    }
    
    const category = getFileCategory(file);
    const config = FILE_TYPE_CONFIG[file.type as keyof typeof FILE_TYPE_CONFIG];
    
    if (!category || !config) {
        errors.push(`Unknown file category for ${file.type}`);
        return { isValid: false, errors, warnings, needsCompression };
    }
    
    const categoryLimits = SIZE_LIMITS[category];
    const maxSize = typeof categoryLimits === 'object' && 'max' in categoryLimits ? categoryLimits.max : categoryLimits as number;
    
    // Check size limits
    if (file.size > maxSize) {
        if (config.compressible) {
            // For compressible files, warn but allow (will compress)
            warnings.push(
                `${file.name} (${formatFileSize(file.size)}) will be compressed to reduce size`
            );
            needsCompression = true;
        } else {
            // For non-compressible files, this is an error
            errors.push(
                `${file.name} (${formatFileSize(file.size)}) exceeds maximum size of ${formatFileSize(maxSize)}`
            );
        }
    } else if (config.compressible && file.size > 1024 * 1024) {
        // Suggest compression for images over 1MB
        warnings.push(`${file.name} will be optimized to improve upload speed`);
        needsCompression = true;
    }
    
    return {
        isValid: errors.length === 0,
        errors,
        warnings,
        needsCompression,
    };
}

export function validateFiles(files: File[]): FileValidationResult {
    const allErrors: string[] = [];
    const allWarnings: string[] = [];
    let needsCompression = false;
    
    // Check file count
    if (files.length === 0) {
        allErrors.push('Please select at least one file');
        return { isValid: false, errors: allErrors, warnings: allWarnings, needsCompression };
    }
    
    if (files.length > 10) {
        allErrors.push('Maximum 10 files allowed per feedback');
    }
    
    // Check total size
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > SIZE_LIMITS.total) {
        allErrors.push(
            `Total file size (${formatFileSize(totalSize)}) exceeds maximum of ${formatFileSize(SIZE_LIMITS.total)}`
        );
    }
    
    // Validate individual files
    const compressionCandidates: File[] = [];
    files.forEach((file, index) => {
        const validation = validateFile(file);
        
        if (!validation.isValid) {
            validation.errors.forEach(error => {
                allErrors.push(`File ${index + 1}: ${error}`);
            });
        }
        
        validation.warnings.forEach(warning => {
            allWarnings.push(`File ${index + 1}: ${warning}`);
        });
        
        if (validation.needsCompression) {
            needsCompression = true;
            compressionCandidates.push(file);
        }
    });
    
    // Add helpful compression info
    if (compressionCandidates.length > 0) {
        const imageCount = compressionCandidates.filter(f => f.type.startsWith('image/')).length;
        if (imageCount > 0) {
            allWarnings.push(
                `${imageCount} image${imageCount > 1 ? 's' : ''} will be automatically compressed to improve quality and upload speed`
            );
        }
    }
    
    return {
        isValid: allErrors.length === 0,
        errors: allErrors,
        warnings: allWarnings,
        needsCompression,
    };
}

export async function uploadFeedbackAttachment(
    file: File,
    userId?: string
): Promise<AttachmentFile> {
    const supabase = createClient();
    
    // Validate file
    const validation = validateFile(file);
    if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
    }
    
    // Generate unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop() || '';
    const fileName = `feedback_${timestamp}_${randomId}${fileExtension ? '.' + fileExtension : ''}`;
    const filePath = `feedback/${fileName}`;
    
    // Upload to Supabase storage
    const { data, error } = await supabase.storage
        .from('file_transfer')
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
            metadata: {
                originalName: file.name,
                uploadedBy: userId || 'anonymous',
                purpose: 'feedback_attachment',
            }
        });
        
    if (error) {
        throw new Error(`Upload failed: ${error.message}`);
    }
    
    // Create a signed URL for download (valid for 7 days)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('file_transfer')
        .createSignedUrl(data.path, 7 * 24 * 60 * 60, {
            download: true
        });
        
    if (signedUrlError || !signedUrlData) {
        throw new Error(`Failed to create signed URL: ${signedUrlError?.message || 'Unknown error'}`);
    }
        
    return {
        name: file.name,
        size: file.size,
        type: file.type,
        url: signedUrlData.signedUrl,
        uploadedAt: new Date().toISOString(),
    };
}

export async function uploadFeedbackAttachments(
    files: File[],
    userId?: string,
    onProgress?: (progress: number) => void
): Promise<AttachmentFile[]> {
    // Validate all files first
    const validation = validateFiles(files);
    if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
    }
    
    const uploadedFiles: AttachmentFile[] = [];
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file) continue;
        
        try {
            const uploaded = await uploadFeedbackAttachment(file, userId);
            uploadedFiles.push(uploaded);
            
            // Update progress
            onProgress?.((i + 1) / files.length * 100);
        } catch (error) {
            // If one file fails, we should clean up successfully uploaded files
            await cleanupFailedUploads(uploadedFiles);
            throw new Error(`Failed to upload ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    
    return uploadedFiles;
}


async function cleanupFailedUploads(uploadedFiles: AttachmentFile[]): Promise<void> {
    const supabase = createClient();
    
    for (const file of uploadedFiles) {
        try {
            const fileName = file.url.split('/').pop();
            if (fileName) {
                await supabase.storage
                    .from('file_transfer')
                    .remove([fileName]);
            }
        } catch (error) {
            console.error('Failed to cleanup file:', error);
        }
    }
}


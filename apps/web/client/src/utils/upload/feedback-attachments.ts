import { createClient } from '@/utils/supabase/client';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = [
    // Images
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    // Documents
    'application/pdf',
    'text/plain',
    'application/json',
    // Archives
    'application/zip',
    'application/x-zip-compressed',
    // Video (small files only)
    'video/mp4',
    'video/webm',
    'video/quicktime',
];

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
}

export function validateFile(file: File): FileValidationResult {
    const errors: string[] = [];
    
    if (file.size > MAX_FILE_SIZE) {
        errors.push(`File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }
    
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        errors.push(`File type ${file.type} is not allowed`);
    }
    
    return {
        isValid: errors.length === 0,
        errors,
    };
}

export function validateFiles(files: File[]): FileValidationResult {
    const allErrors: string[] = [];
    
    if (files.length > 5) {
        allErrors.push('Maximum 5 files allowed');
    }
    
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > MAX_FILE_SIZE * 3) { // Max 30MB total
        allErrors.push('Total file size must be less than 30MB');
    }
    
    files.forEach((file, index) => {
        const validation = validateFile(file);
        if (!validation.isValid) {
            validation.errors.forEach(error => {
                allErrors.push(`File ${index + 1} (${file.name}): ${error}`);
            });
        }
    });
    
    return {
        isValid: allErrors.length === 0,
        errors: allErrors,
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
    
    // Upload to Supabase storage
    const { data, error } = await supabase.storage
        .from('file_transfer')
        .upload(fileName, file, {
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
    
    // Get the public URL
    const { data: urlData } = supabase.storage
        .from('file_transfer')
        .getPublicUrl(data.path);
        
    return {
        name: file.name,
        size: file.size,
        type: file.type,
        url: urlData.publicUrl,
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

export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
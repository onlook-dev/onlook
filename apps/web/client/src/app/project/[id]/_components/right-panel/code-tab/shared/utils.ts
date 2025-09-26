import { hashContent } from '@/services/sync-engine/sync-engine';
import type { EditorFile, TextEditorFile } from './types';

// Check if file content differs from original
export async function isDirty(file: EditorFile): Promise<boolean> {
    if (file.type === 'binary') {
        return false; // Binary files are never considered dirty
    }

    if (file.type === 'text') {
        const textFile = file as TextEditorFile;
        const currentHash = await hashContent(textFile.content);
        return currentHash !== textFile.originalHash;
    }

    return false;
}
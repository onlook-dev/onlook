import type { EditorEngine } from '@/components/store/editor/engine';

export async function handleReadStyleGuideTool(editorEngine: EditorEngine): Promise<{
    configPath: string;
    cssPath: string;
    configContent: string;
    cssContent: string;
}> {
    const result = await editorEngine.theme.initializeTailwindColorContent();
    if (!result) {
        throw new Error('Style guide files not found');
    }
    return result;
}

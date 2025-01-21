import type { ImageMessageContext } from '@onlook/models/chat';

export function createProjectPrompt(prompt: string, images: ImageMessageContext[]) {
    console.log('createProjectPrompt');
    console.log(prompt, images);
}

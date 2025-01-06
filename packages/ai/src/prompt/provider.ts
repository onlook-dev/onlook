import type {
    FileMessageContext,
    HighlightMessageContext,
    ImageMessageContext,
} from '@onlook/models/chat';
import type { LanguageModelV1TextPart, LanguageModelV1ImagePart } from '@ai-sdk/provider';
import type { UserContent } from '@onlook/models/chat/message';
import { EDIT_PROMPTS, EXAMPLE_CONVERSATION } from './edit';
import { FILE_PROMPTS } from './file';
import { FENCE } from './format';
import { wrapXml } from './helpers';
import { PLATFORM_SIGNATURE } from './platform';

export class PromptProvider {
    shouldWrapXml: boolean;
    constructor(shouldWrapXml = true) {
        this.shouldWrapXml = shouldWrapXml;
    }

    getSystemPrompt(platform: NodeJS.Platform) {
        let prompt = '';

        if (this.shouldWrapXml) {
            prompt += wrapXml('role', EDIT_PROMPTS.system);
            prompt += wrapXml('search-replace-rules', EDIT_PROMPTS.searchReplaceRules);
            prompt += wrapXml('example-conversation', this.getExampleConversation());
        } else {
            prompt += EDIT_PROMPTS.system;
            prompt += EDIT_PROMPTS.searchReplaceRules;
            prompt += this.getExampleConversation();
        }
        prompt = prompt.replace(PLATFORM_SIGNATURE, platform);
        return prompt;
    }

    getExampleConversation() {
        let prompt = '';
        for (const message of EXAMPLE_CONVERSATION) {
            prompt += `${message.role.toUpperCase()}: ${message.content}\n`;
        }
        return prompt;
    }

    getUserMessage(
        message: string,
        context: {
            files: FileMessageContext[];
            highlights: HighlightMessageContext[];
            images: ImageMessageContext[];
        },
    ): UserContent {
        if (message.length === 0) {
            throw new Error('Message is required');
        }

        const content: UserContent = [];

        // Add file and highlight context if present
        let contextPrompt = this.getFilesContent(context.files, context.highlights);
        if (contextPrompt) {
            content.push({
                type: 'text',
                text: this.shouldWrapXml ? wrapXml('context', contextPrompt) : contextPrompt,
            });
        }

        // Add images if present
        if (context.images && context.images.length > 0) {
            for (const image of context.images) {
                const base64Data = image.content.replace(/^data:image\/[a-z]+;base64,/, '');
                content.push({
                    type: 'image',
                    image: new Uint8Array(Buffer.from(base64Data, 'base64')),
                    mimeType: image.mediaType || 'image/jpeg', // Default to JPEG if not specified
                });
            }
        }

        // Add the main message
        content.push({
            type: 'text',
            text: this.shouldWrapXml ? wrapXml('instruction', message) : message,
        });

        // For testing purposes, convert to string if needed
        if (process.env.NODE_ENV === 'test') {
            const xmlContent = content
                .map((part) => {
                    if (part.type === 'text') {
                        return part.text;
                    }
                    return ''; // Skip image parts in test output
                })
                .join('');
            Object.defineProperty(content, 'toString', {
                value: () => xmlContent,
                enumerable: false,
            });
        }

        return content;
    }

    getFilesContent(files: FileMessageContext[], highlights: HighlightMessageContext[]) {
        if (files.length === 0) {
            return '';
        }
        let prompt = '';
        prompt += `${FILE_PROMPTS.filesContentPrefix}\n`;
        let index = 1;
        for (const file of files) {
            let filePrompt = `${file.path}\n`;
            filePrompt += `${FENCE.code.start}${this.getLanguageFromFilePath(file.path)}\n`;
            filePrompt += file.content;
            filePrompt += `\n${FENCE.code.end}\n`;
            filePrompt += this.getHighlightsContent(file.path, highlights);

            if (this.shouldWrapXml) {
                filePrompt = wrapXml(files.length > 1 ? `file-${index}` : 'file', filePrompt);
            }
            prompt += filePrompt;
            index++;
        }

        return prompt;
    }

    getLanguageFromFilePath(filePath: string) {
        return filePath.split('.').pop();
    }

    getHighlightsContent(filePath: string, highlights: HighlightMessageContext[]) {
        const fileHighlights = highlights.filter((h) => h.path === filePath);
        if (fileHighlights.length === 0) {
            return '';
        }
        let prompt = `${FILE_PROMPTS.highlightPrefix}\n`;
        let index = 1;
        for (const highlight of fileHighlights) {
            let highlightPrompt = `${filePath}#L${highlight.start}:L${highlight.end}\n`;
            highlightPrompt += `${FENCE.code.start}\n`;
            highlightPrompt += highlight.content;
            highlightPrompt += `\n${FENCE.code.end}\n`;
            if (this.shouldWrapXml) {
                highlightPrompt = wrapXml(
                    fileHighlights.length > 1 ? `highlight-${index}` : 'highlight',
                    highlightPrompt,
                );
            }
            prompt += highlightPrompt;
            index++;
        }
        return prompt;
    }

    getImagesContent(images: ImageMessageContext[]) {
        if (images.length === 0) {
            return '';
        }
        let prompt = 'Images:\n';
        let index = 1;
        for (const image of images) {
            let imagePrompt = `${image.displayName || `Image ${index}`}\n`;
            imagePrompt += image.content;
            imagePrompt += '\n';

            if (this.shouldWrapXml) {
                imagePrompt = wrapXml(images.length > 1 ? `image-${index}` : 'image', imagePrompt);
            }
            prompt += imagePrompt;
            index++;
        }
        return prompt;
    }
}

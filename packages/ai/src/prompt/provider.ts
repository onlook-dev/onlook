import { EDIT_PROMPTS, EXAMPLE_CONVERSATION } from './edit';
import { FILE_PROMPTS } from './file';
import { FENCE } from './format';
import { wrapXml } from './helpers';
import { PLATFORM_SIGNATURE } from './platform';

export interface ContextHighlight {
    start: number;
    end: number;
    content: string;
}

export interface ContextFile {
    path: string;
    content: string;
    language: string;
    highlights: ContextHighlight[];
}

export class PromptProvider {
    platform: string;

    constructor(platform: NodeJS.Platform) {
        this.platform = platform;
    }

    get system() {
        let prompt = '';
        prompt += wrapXml('role', EDIT_PROMPTS.system);
        prompt += wrapXml('search-replace-rules', EDIT_PROMPTS.searchReplaceRules);
        prompt += wrapXml('example-conversation', this.example);
        prompt = prompt.replace(PLATFORM_SIGNATURE, this.platform);
        return prompt;
    }

    get example() {
        let prompt = '';
        for (const message of EXAMPLE_CONVERSATION) {
            prompt += `${message.role.toUpperCase()}: ${message.content}\n`;
        }
        return prompt;
    }

    getUserMessage(
        message: string,
        context: {
            files: ContextFile[];
            highlights: ContextHighlight[];
        },
    ) {
        if (message.length === 0) {
            throw new Error('Message is required');
        }

        let prompt = '';
        const filesContent = this.getFilesContent(context.files);
        if (filesContent) {
            prompt += wrapXml('files', filesContent);
        }
        prompt += wrapXml('instruction', message);
        return prompt;
    }

    getFilesContent(files: ContextFile[]) {
        if (files.length === 0) {
            return '';
        }
        let prompt = '';
        prompt += `${FILE_PROMPTS.filesContentPrefix}\n`;
        for (const file of files) {
            prompt += `${file.path}\n`;
            prompt += `${FENCE.code.start}${file.language}\n`;
            prompt += file.content;
            prompt += `\n${FENCE.code.end}\n`;
            prompt += this.getHighlightsContent(file.path, file.highlights);
        }
        return prompt;
    }

    getHighlightsContent(filePath: string, highlights: ContextHighlight[]) {
        if (highlights.length === 0) {
            return '';
        }
        let prompt = `${FILE_PROMPTS.highlightPrefix}\n`;
        for (const highlight of highlights) {
            prompt += `${filePath}#L${highlight.start}:L${highlight.end}\n`;
            prompt += `${FENCE.code.start}\n`;
            prompt += highlight.content;
            prompt += `\n${FENCE.code.end}\n`;
        }
        prompt = wrapXml('highlights', prompt);
        return prompt;
    }
}

import { BASE_PROMPTS } from './base';
import { EDIT_PROMPTS, EXAMPLE_CONVERSATION } from './edit';
import { Platform, PLATFORM_SIGNATURE } from './platform';

export class PromptProvider {
    platform: Platform;

    constructor(platform: Platform) {
        this.platform = platform;
    }

    getSystemPrompt() {
        let prompt = '';
        prompt += `<instruction>${BASE_PROMPTS.reactRole}\n${EDIT_PROMPTS.system}</instruction>\n`;
        prompt += `<search-replace-rules>${EDIT_PROMPTS.searchReplaceRules}</search-replace-rules>\n`;
        prompt += `<example-conversation>${this.getExampleConversation()}</example-conversation>\n`;

        prompt = prompt.replace(PLATFORM_SIGNATURE, this.platform);
        return prompt;
    }

    getExampleConversation() {
        let prompt = '';
        for (const message of EXAMPLE_CONVERSATION) {
            prompt += `${message.role.toUpperCase()}: ${message.content}\n`;
        }
        return prompt;
    }
}

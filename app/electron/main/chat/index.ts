import Anthropic from '@anthropic-ai/sdk';
import { MessageParam } from '@anthropic-ai/sdk/resources';

class LLMService {
    private static instance: LLMService;
    private anthropic: Anthropic;

    private constructor() {
        this.anthropic = new Anthropic({
            apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
        });
    }

    public static getInstance(): LLMService {
        if (!LLMService.instance) {
            LLMService.instance = new LLMService();
        }
        return LLMService.instance;
    }

    public async send(messages: MessageParam[]): Promise<Anthropic.Messages.Message> {
        return this.anthropic.messages.create({
            model: 'claude-3-5-sonnet-20240620',
            max_tokens: 1024,
            messages,
        });
    }
}

export default LLMService.getInstance();

import Anthropic from '@anthropic-ai/sdk';
import { MessageParam } from '@anthropic-ai/sdk/resources';

enum CLAUDE_MODELS {
    SONNET = 'claude-3-5-sonnet-20240620',
    HAIKU = 'claude-3-haiku-20240307',
}
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
        console.log('Sending messages to LLM:', messages);
        return {};
        // TODO: Handle stream https://docs.anthropic.com/en/api/messages-streaming
        return this.anthropic.messages.create({
            model: CLAUDE_MODELS.HAIKU,
            max_tokens: 1024,
            system: 'You are a seasoned React and Tailwind expert.',
            messages,
        });
    }
}

export default LLMService.getInstance();

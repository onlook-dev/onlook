import Anthropic from '@anthropic-ai/sdk';
import { MessageParam } from '@anthropic-ai/sdk/resources';
import { GENERATE_CODE_TOOL } from './tool';
import { MainChannels } from '/common/constants';
import { StreamResponse } from '/common/models/chat/stream';

enum CLAUDE_MODELS {
    SONNET = 'claude-3-5-sonnet-latest',
    HAIKU = 'claude-3-haiku-20240307',
}

class LLMService {
    private static instance: LLMService;
    private anthropic: Anthropic;
    private mainWindow: Electron.BrowserWindow | null = null;

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

    public setMainWindow(window: Electron.BrowserWindow) {
        this.mainWindow = window;
    }

    private emitStreamUpdate(response: StreamResponse) {
        if (this.mainWindow?.webContents) {
            this.mainWindow.webContents.send(MainChannels.CHAT_STREAM_RESPONSE, response);
        }
    }

    public async send(messages: MessageParam[]): Promise<Anthropic.Messages.Message> {
        return this.anthropic.messages.create({
            model: CLAUDE_MODELS.SONNET,
            max_tokens: 4096,
            system: 'You are a seasoned React and Tailwind expert.',
            messages,
            tools: [GENERATE_CODE_TOOL],
        });
    }

    public async stream(messages: MessageParam[], requestId: string): Promise<void> {
        const stream = this.anthropic.messages
            .stream({
                model: CLAUDE_MODELS.SONNET,
                max_tokens: 4096,
                system: 'You are a seasoned React and Tailwind expert.',
                messages,
                tools: [GENERATE_CODE_TOOL],
                stream: true,
            })
            .on('contentBlock', (content) => console.log('contentBlock', content))
            .on('message', (message) => console.log('message', message));

        for await (const event of stream) {
            console.log('event', event);
        }

        const message = await stream.finalMessage();
        console.log('finalMessage', message);
    }
}

export default LLMService.getInstance();

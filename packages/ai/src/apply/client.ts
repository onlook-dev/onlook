import OpenAI from 'openai';

const createPrompt = (originalCode: string, updateSnippet: string) => `<code>${originalCode}</code>
<update>${updateSnippet}</update>`;

export class FastApplyClient {
    private readonly client: OpenAI;

    constructor(apiKey: string) {
        this.client = new OpenAI({
            apiKey,
            baseURL: 'https://api.morphllm.com/v1',
        });
    }

    async applyCodeChange(originalCode: string, updateSnippet: string): Promise<string | null> {
        const response = await this.client.chat.completions.create({
            model: 'morph-v2',
            messages: [
                {
                    role: 'user',
                    content: createPrompt(originalCode, updateSnippet),
                },
            ],
        });
        return response.choices[0]?.message.content || null;
    }
}

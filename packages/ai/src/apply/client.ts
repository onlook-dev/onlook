import OpenAI from 'openai';

const createPrompt = (originalCode: string, updateSnippet: string, instruction: string) =>
    `<instruction>${instruction}</instruction>\n<code>${originalCode}</code>\n<update>${updateSnippet}</update>`;

export enum FastApplyProvider {
    MORPH = 'morph',
    RELACE = 'relace',
}

export async function applyCodeChangeWithMorph(
    originalCode: string,
    updateSnippet: string,
    instruction: string,
): Promise<string | null> {
    const apiKey = process.env.MORPH_API_KEY;
    if (!apiKey) {
        throw new Error('MORPH_API_KEY is not set');
    }
    const client = new OpenAI({
        apiKey,
        baseURL: 'https://api.morphllm.com/v1',
    });

    const response = await client.chat.completions.create({
        model: 'morph-v3-large',
        messages: [
            {
                role: 'user',
                content: createPrompt(originalCode, updateSnippet, instruction),
            },
        ],
    });
    return response.choices[0]?.message.content || null;
}

export async function applyCodeChangeWithRelace(
    originalCode: string,
    updateSnippet: string,
): Promise<string | null> {
    const apiKey = process.env.RELACE_API_KEY;
    if (!apiKey) {
        throw new Error('RELACE_API_KEY is not set');
    }
    const url = 'https://instantapply.endpoint.relace.run/v1/code/apply';
    const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
    };

    const data = {
        initialCode: originalCode,
        editSnippet: updateSnippet,
    };

    const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        throw new Error(`Failed to apply code change: ${response.status}`);
    }
    const result = await response.json();
    return result.mergedCode;
}

export async function applyCodeChange(
    originalCode: string,
    updateSnippet: string,
    instruction: string,
    preferredProvider: FastApplyProvider = FastApplyProvider.MORPH,
): Promise<string | null> {
    const providerAttempts = [
        {
            provider: preferredProvider,
            applyFn:
                preferredProvider === FastApplyProvider.MORPH
                    ? applyCodeChangeWithMorph
                    : applyCodeChangeWithRelace,
        },
        {
            provider:
                preferredProvider === FastApplyProvider.MORPH
                    ? FastApplyProvider.RELACE
                    : FastApplyProvider.MORPH,
            applyFn:
                preferredProvider === FastApplyProvider.MORPH
                    ? applyCodeChangeWithRelace
                    : applyCodeChangeWithMorph,
        },
    ];

    // Run provider attempts in order of preference
    for (const { provider, applyFn } of providerAttempts) {
        try {
            const result =
                provider === FastApplyProvider.MORPH
                    ? await (applyFn as typeof applyCodeChangeWithMorph)(
                          originalCode,
                          updateSnippet,
                          instruction,
                      )
                    : await (applyFn as typeof applyCodeChangeWithRelace)(
                          originalCode,
                          updateSnippet,
                      );
            if (result) return result;
        } catch (error) {
            console.warn(`Code application failed with provider ${provider}:`, error);
            throw error;
        }
    }

    return null;
}

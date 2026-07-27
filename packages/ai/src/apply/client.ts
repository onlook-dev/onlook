import OpenAI from 'openai';

import type { ApplyCodeChangeAssessment, ApplyCodeChangeGateOptions } from './quality';
import { assessCodeChange, shouldBlockApply } from './quality';

export interface ApplyCodeChangeMetadata {
    userId?: string;
    projectId?: string;
    conversationId?: string;
}

export interface ApplyCodeChangeQualityOptions {
    gate?: ApplyCodeChangeGateOptions;
    blockBeforeProvider?: boolean;
}

export interface ApplyCodeChangeWithQualityResult {
    code: string | null;
    preflightAssessment: ApplyCodeChangeAssessment;
    resultAssessment?: ApplyCodeChangeAssessment;
    blocked: boolean;
    blockReason?: string;
}

interface RelaceApplyResponse {
    mergedCode?: string | null;
}

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
    return response.choices[0]?.message.content ?? null;
}

export async function applyCodeChangeWithRelace(
    originalCode: string,
    updateSnippet: string,
    instruction: string,
    metadata?: ApplyCodeChangeMetadata,
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
        instructions: instruction,
        relaceMetadata: metadata
            ? {
                  onlookUserId: metadata.userId,
                  onlookProjectId: metadata.projectId,
                  onlookConversationId: metadata.conversationId,
              }
            : undefined,
    };

    const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        throw new Error(`Failed to apply code change: ${response.status}`);
    }
    const result = (await response.json()) as RelaceApplyResponse;
    return result.mergedCode ?? null;
}

export async function applyCodeChange(
    originalCode: string,
    updateSnippet: string,
    instruction: string,
    metadata?: ApplyCodeChangeMetadata,
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

    let lastError: unknown = null;

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
                    : await applyFn(originalCode, updateSnippet, instruction, metadata);
            if (result) return result;
        } catch (error) {
            console.warn(`Code application failed with provider ${provider}:`, error);
            lastError = error;
        }
    }

    if (lastError instanceof Error) throw lastError;
    if (lastError) throw new Error('Code application failed with a non-error value.');
    return null;
}

export async function applyCodeChangeWithQuality(
    originalCode: string,
    updateSnippet: string,
    instruction: string,
    metadata?: ApplyCodeChangeMetadata,
    preferredProvider: FastApplyProvider = FastApplyProvider.MORPH,
    options: ApplyCodeChangeQualityOptions = {},
): Promise<ApplyCodeChangeWithQualityResult> {
    const preflightAssessment = assessCodeChange(originalCode, updateSnippet, instruction);
    if (options.blockBeforeProvider && shouldBlockApply(preflightAssessment, options.gate)) {
        return {
            code: null,
            preflightAssessment,
            blocked: true,
            blockReason:
                preflightAssessment.blockingConcerns[0] ??
                `Preflight score ${preflightAssessment.score} is below the configured gate.`,
        };
    }

    const code = await applyCodeChange(
        originalCode,
        updateSnippet,
        instruction,
        metadata,
        preferredProvider,
    );
    return {
        code,
        preflightAssessment,
        resultAssessment: code
            ? assessCodeChange(originalCode, updateSnippet, instruction, code)
            : undefined,
        blocked: false,
    };
}

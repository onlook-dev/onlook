/**
 * LightLLM Router Configuration for Cynthia
 * Routes tasks to appropriate models based on capability requirements
 */

import { LLMProvider, OPENROUTER_MODELS } from '../llm';

export enum TaskRoute {
    UI_AUDIT_REASONING = 'UI_AUDIT_REASONING',
    MULTIMODAL_UNDERSTAND = 'MULTIMODAL_UNDERSTAND',
    PIXEL_TO_PIXEL_REPLICATION = 'PIXEL_TO_PIXEL_REPLICATION',
    COPY_REWRITE_LUXURY = 'COPY_REWRITE_LUXURY',
    CODE_REFACTOR = 'CODE_REFACTOR',
}

export interface ModelTier {
    name: string;
    provider: LLMProvider;
    model: string;
    description: string;
    isPremium?: boolean;
}

export const MODEL_TIERS: Record<string, ModelTier> = {
    ReasonerTier: {
        name: 'ReasonerTier',
        provider: LLMProvider.OPENROUTER,
        model: OPENROUTER_MODELS.CLAUDE_4_5_SONNET,
        description: 'Best available reasoning model for UDEC scoring and design critique',
    },
    WriterTier: {
        name: 'WriterTier',
        provider: LLMProvider.OPENROUTER,
        model: OPENROUTER_MODELS.OPEN_AI_GPT_5,
        description: 'High-polish copy and UX microcopy',
    },
    CoderTier: {
        name: 'CoderTier',
        provider: LLMProvider.OPENROUTER,
        model: OPENROUTER_MODELS.OPEN_AI_GPT_5,
        description: 'Safe diffs and component refactors',
    },
    GeminiTier: {
        name: 'GeminiTier',
        provider: LLMProvider.OPENROUTER,
        model: OPENROUTER_MODELS.OPEN_AI_GPT_5,
        description: 'Multimodal understanding and layout detection',
    },
    BackupTier: {
        name: 'BackupTier',
        provider: LLMProvider.OPENROUTER,
        model: OPENROUTER_MODELS.CLAUDE_3_5_HAIKU,
        description: 'Cheaper, reliable fallback',
    },
};

export const TASK_ROUTING: Record<TaskRoute, ModelTier> = {
    [TaskRoute.UI_AUDIT_REASONING]: MODEL_TIERS.ReasonerTier,
    [TaskRoute.MULTIMODAL_UNDERSTAND]: MODEL_TIERS.GeminiTier,
    [TaskRoute.PIXEL_TO_PIXEL_REPLICATION]: {
        ...MODEL_TIERS.GeminiTier,
        isPremium: true,
    },
    [TaskRoute.COPY_REWRITE_LUXURY]: MODEL_TIERS.WriterTier,
    [TaskRoute.CODE_REFACTOR]: MODEL_TIERS.CoderTier,
};

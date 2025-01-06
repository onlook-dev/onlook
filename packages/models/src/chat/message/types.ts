import type { LanguageModelV1TextPart, LanguageModelV1ImagePart } from '@ai-sdk/provider';

export type UserContent = Array<LanguageModelV1TextPart | LanguageModelV1ImagePart>;

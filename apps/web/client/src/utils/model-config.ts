import { env } from '@/env';
import { CLAUDE_MODELS, GEMINI_MODELS, type InitialModelPayload, LLMProvider, OPENROUTER_MODELS } from '@onlook/models';

const isProd = env.NODE_ENV === 'production';

/**
 * 获取主要聊天模型配置
 * 优先使用Anthropic，如果API密钥不可用则使用Gemini
 */
export function getMainModelConfig(): InitialModelPayload {
    if (isProd) {
        return {
            provider: LLMProvider.OPENROUTER,
            model: OPENROUTER_MODELS.CLAUDE_4_SONNET,
        };
    }
    
    // 开发环境：优先使用Anthropic，如果API密钥不可用则回退到Gemini
    if (env.ANTHROPIC_API_KEY) {
        return {
            provider: LLMProvider.ANTHROPIC,
            model: CLAUDE_MODELS.SONNET_4,
        };
    }
    
    // 回退到Gemini
    return {
        provider: LLMProvider.GOOGLE_AI_STUDIO,
        model: GEMINI_MODELS.GEMINI_2_5_PRO,
    };
}

/**
 * 获取建议生成模型配置
 * 对于建议生成，我们使用较轻量的模型以提高响应速度
 */
export function getSuggestionModelConfig(): InitialModelPayload {
    if (isProd) {
        return {
            provider: LLMProvider.OPENROUTER,
            model: OPENROUTER_MODELS.OPEN_AI_GPT_4_1_NANO,
        };
    }
    
    // 开发环境：优先使用Anthropic，如果API密钥不可用则回退到Gemini
    if (env.ANTHROPIC_API_KEY) {
        return {
            provider: LLMProvider.ANTHROPIC,
            model: CLAUDE_MODELS.HAIKU, // 使用更快的Haiku模型用于建议
        };
    }
    
    // 回退到Gemini Flash（更快的版本）
    return {
        provider: LLMProvider.GOOGLE_AI_STUDIO,
        model: GEMINI_MODELS.GEMINI_2_5_FLASH,
    };
}
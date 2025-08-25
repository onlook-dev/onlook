import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
    /**
     * Specify your server-side environment variables schema here. This way you can ensure the app
     * isn't built with invalid env vars.
     */
    server: {
        NODE_ENV: z.enum(['development', 'test', 'production']),
        CSB_API_KEY: z.string(),
        SUPABASE_DATABASE_URL: z.string().url(),
        RESEND_API_KEY: z.string().optional(),
        FREESTYLE_API_KEY: z.string().optional(),

        // Stripe
        STRIPE_WEBHOOK_SECRET: z.string().optional(),
        STRIPE_SECRET_KEY: z.string().optional(),

        // Apply models
        MORPH_API_KEY: z.string().optional(),
        RELACE_API_KEY: z.string().optional(),

        // Bedrock
        AWS_ACCESS_KEY_ID: z.string().optional(),
        AWS_SECRET_ACCESS_KEY: z.string().optional(),
        AWS_REGION: z.string().optional(),

        // Google Vertex AI
        GOOGLE_CLIENT_EMAIL: z.string().optional(),
        GOOGLE_PRIVATE_KEY: z.string().optional(),
        GOOGLE_PRIVATE_KEY_ID: z.string().optional(),

        // Model providers
        OPENROUTER_API_KEY: z.string(),
        ANTHROPIC_API_KEY: z.string().optional(),
        GOOGLE_AI_STUDIO_API_KEY: z.string().optional(),
        OPENAI_API_KEY: z.string().optional(),

        // n8n
        N8N_WEBHOOK_URL: z.string().optional(),
        N8N_API_KEY: z.string().optional(),

        // Firecrawl
        FIRECRAWL_API_KEY: z.string().optional(),

        // Exa
        EXA_API_KEY: z.string().optional(),

        // Langfuse
        LANGFUSE_SECRET_KEY: z.string().optional(),
        LANGFUSE_PUBLIC_KEY: z.string().optional(),
        LANGFUSE_BASEURL: z.string().url().optional(),

        // Feedback
        FEEDBACK_FROM_EMAIL: z.string().email().optional(),
        FEEDBACK_TO_EMAIL: z.string().email().optional(),
    },
    /**
     * Specify your client-side environment variables schema here. This way you can ensure the app
     * isn't built with invalid env vars. To expose them to the client, prefix them with
     * `NEXT_PUBLIC_`.
     */
    client: {
        NEXT_PUBLIC_SITE_URL: z.string().url().default('http://localhost:3000'),
        NEXT_PUBLIC_SUPABASE_URL: z.string(),
        NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string(),
        NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
        NEXT_PUBLIC_POSTHOG_HOST: z.string().optional(),
        NEXT_PUBLIC_FEATURE_COLLABORATION: z.boolean().default(false),
        NEXT_PUBLIC_HOSTING_DOMAIN: z.string().optional(),
        NEXT_PUBLIC_RB2B_ID: z.string().optional(),
    },

    /**
     * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
     * middlewares) or client-side so we need to destruct manually.
     */
    runtimeEnv: {
        NODE_ENV: process.env.NODE_ENV,
        CSB_API_KEY: process.env.CSB_API_KEY,
        RESEND_API_KEY: process.env.RESEND_API_KEY,
        NEXT_PUBLIC_FEATURE_COLLABORATION: process.env.NEXT_PUBLIC_FEATURE_COLLABORATION,

        // Supabase
        SUPABASE_DATABASE_URL: process.env.SUPABASE_DATABASE_URL,
        NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,

        // Posthog
        NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
        NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,

        // RB2B
        NEXT_PUBLIC_RB2B_ID: process.env.NEXT_PUBLIC_RB2B_ID,

        // Hosting
        FREESTYLE_API_KEY: process.env.FREESTYLE_API_KEY,
        NEXT_PUBLIC_HOSTING_DOMAIN: process.env.NEXT_PUBLIC_HOSTING_DOMAIN,

        // Stripe
        STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
        STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,

        // Apply models
        MORPH_API_KEY: process.env.MORPH_API_KEY,
        RELACE_API_KEY: process.env.RELACE_API_KEY,

        // Bedrock
        AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
        AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
        AWS_REGION: process.env.AWS_REGION,

        // Google Vertex AI
        GOOGLE_CLIENT_EMAIL: process.env.GOOGLE_CLIENT_EMAIL,
        GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY,
        GOOGLE_PRIVATE_KEY_ID: process.env.GOOGLE_PRIVATE_KEY_ID,

        // Model providers
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
        GOOGLE_AI_STUDIO_API_KEY: process.env.GOOGLE_AI_STUDIO_API_KEY,
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,

        // n8n
        N8N_WEBHOOK_URL: process.env.N8N_WEBHOOK_URL,
        N8N_API_KEY: process.env.N8N_API_KEY,

        // Firecrawl
        FIRECRAWL_API_KEY: process.env.FIRECRAWL_API_KEY,

        // Exa
        EXA_API_KEY: process.env.EXA_API_KEY,

        // Langfuse
        LANGFUSE_SECRET_KEY: process.env.LANGFUSE_SECRET_KEY,
        LANGFUSE_PUBLIC_KEY: process.env.LANGFUSE_PUBLIC_KEY,
        LANGFUSE_BASEURL: process.env.LANGFUSE_BASEURL,

        // Feedback
        FEEDBACK_FROM_EMAIL: process.env.FEEDBACK_FROM_EMAIL,
        FEEDBACK_TO_EMAIL: process.env.FEEDBACK_TO_EMAIL,
    },
    /**
     * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
     * useful for Docker builds.
     */
    skipValidation: !!process.env.SKIP_ENV_VALIDATION,
    /**
     * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
     * `SOME_VAR=''` will throw an error.
     */
    emptyStringAsUndefined: true,
});

/**
 * Cynthia Audit Engine
 * Implements the UDEC scoring system and audit pipeline
 */

import { streamText, generateObject } from 'ai';
import { z } from 'zod';
import { initModel } from '../prompt/provider';
import { LLMProvider, OPENROUTER_MODELS, TaskRoute, TASK_ROUTING, type AuditInput, type CynthiaReport, type DesignIssue, UDECAxis, IssueSeverity, FixType } from '@onlook/models';
import { getCynthiaSystemPrompt } from '../prompt/constants/cynthia';

/**
 * UDEC Score Schema for validation
 */
const UDECScoresSchema = z.object({
    [UDECAxis.CTX]: z.number().min(0).max(100),
    [UDECAxis.DYN]: z.number().min(0).max(100),
    [UDECAxis.LFT]: z.number().min(0).max(100),
    [UDECAxis.TYP]: z.number().min(0).max(100),
    [UDECAxis.CLR]: z.number().min(0).max(100),
    [UDECAxis.GRD]: z.number().min(0).max(100),
    [UDECAxis.SPC]: z.number().min(0).max(100),
    [UDECAxis.IMG]: z.number().min(0).max(100),
    [UDECAxis.MOT]: z.number().min(0).max(100),
    [UDECAxis.ACC]: z.number().min(0).max(100),
    [UDECAxis.RSP]: z.number().min(0).max(100),
    [UDECAxis.TRD]: z.number().min(0).max(100),
    [UDECAxis.EMO]: z.number().min(0).max(100),
});

/**
 * Design Issue Schema
 */
const DesignIssueSchema = z.object({
    id: z.string(),
    axis: z.nativeEnum(UDECAxis),
    severity: z.nativeEnum(IssueSeverity),
    title: z.string(),
    description: z.string(),
    reason: z.string(),
    impact: z.string(),
    elementPath: z.string().optional(),
    fix: z.object({
        type: z.nativeEnum(FixType),
        description: z.string(),
        measurements: z.object({
            values: z.record(z.union([z.string(), z.number()])).optional(),
            duration: z.string().optional(),
            easing: z.string().optional(),
            contrast: z.number().optional(),
            tapTarget: z.string().optional(),
        }),
        before: z.string().optional(),
        after: z.string().optional(),
    }),
});

/**
 * Cynthia Report Schema
 */
const CynthiaReportSchema = z.object({
    product: z.string(),
    version: z.string(),
    overall_score: z.number().min(0).max(100),
    udec_scores: UDECScoresSchema,
    issues_found_total: z.number(),
    teaser_issues: z.array(DesignIssueSchema),
    full_issues: z.array(DesignIssueSchema),
    fix_packs: z.array(z.object({
        id: z.string(),
        name: z.string(),
        description: z.string(),
        category: z.enum(['layout', 'typography', 'color', 'spacing', 'motion', 'accessibility']),
        issues: z.array(z.string()),
        estimatedImpact: z.string(),
        tradeoffs: z.array(z.string()).optional(),
    })),
    token_changes: z.array(z.object({
        type: z.enum(['color', 'spacing', 'typography', 'motion']),
        before: z.record(z.unknown()),
        after: z.record(z.unknown()),
        affectedComponents: z.array(z.string()),
    })).optional(),
    patch_plan: z.object({
        reversible: z.boolean(),
        changelog: z.array(z.object({
            file: z.string(),
            type: z.enum(['add', 'modify', 'delete']),
            description: z.string(),
            before: z.string().optional(),
            after: z.string().optional(),
        })),
    }).optional(),
});

/**
 * Run Cynthia audit on a target UI
 */
export async function runAudit(input: AuditInput): Promise<Partial<CynthiaReport>> {
    const modelTier = TASK_ROUTING[TaskRoute.UI_AUDIT_REASONING];
    const { model } = initModel({
        provider: modelTier.provider,
        model: modelTier.model as OPENROUTER_MODELS,
    });

    const systemPrompt = getCynthiaSystemPrompt();

    // Build the user prompt with context
    const userPrompt = buildAuditPrompt(input);

    try {
        const { object } = await generateObject({
            model,
            schema: CynthiaReportSchema,
            system: systemPrompt,
            prompt: userPrompt,
        });

        return transformReportToModel(object);
    } catch (error) {
        console.error('Audit failed:', error);
        throw new Error(`Audit execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Build audit prompt from input
 */
function buildAuditPrompt(input: AuditInput): string {
    const { target, context, constraints } = input;

    let prompt = `# Audit Request\n\n`;
    prompt += `**Target:** ${target.type} - ${target.value}\n\n`;

    if (context) {
        prompt += `## Context\n`;
        if (context.productType) prompt += `- Product Type: ${context.productType}\n`;
        if (context.audience) prompt += `- Audience: ${context.audience}\n`;
        if (context.goal) prompt += `- Goal: ${context.goal}\n`;
        prompt += `\n`;
    }

    if (constraints) {
        prompt += `## Constraints\n`;
        if (constraints.brand) prompt += `- Brand: ${JSON.stringify(constraints.brand)}\n`;
        if (constraints.stack) prompt += `- Stack: ${constraints.stack.join(', ')}\n`;
        if (constraints.timeline) prompt += `- Timeline: ${constraints.timeline}\n`;
        prompt += `\n`;
    }

    prompt += `## Instructions\n`;
    prompt += `1. Analyze the target UI thoroughly across all 13 UDEC axes\n`;
    prompt += `2. Identify and prioritize issues by severity (critical, major, minor, info)\n`;
    prompt += `3. Generate the top 3-7 most impactful issues for the teaser report\n`;
    prompt += `4. Provide complete issue list with exact, measurable fixes\n`;
    prompt += `5. Group related fixes into actionable Fix Packs\n`;
    prompt += `6. Calculate an overall Cynthia Score (0-100)\n\n`;
    prompt += `Return your audit as a structured JSON object following the schema provided.`;

    return prompt;
}

/**
 * Transform API response to model format
 */
function transformReportToModel(apiResponse: z.infer<typeof CynthiaReportSchema>): Partial<CynthiaReport> {
    return {
        product: apiResponse.product,
        version: apiResponse.version,
        overallScore: apiResponse.overall_score,
        udecScores: {
            [UDECAxis.CTX]: apiResponse.udec_scores[UDECAxis.CTX],
            [UDECAxis.DYN]: apiResponse.udec_scores[UDECAxis.DYN],
            [UDECAxis.LFT]: apiResponse.udec_scores[UDECAxis.LFT],
            [UDECAxis.TYP]: apiResponse.udec_scores[UDECAxis.TYP],
            [UDECAxis.CLR]: apiResponse.udec_scores[UDECAxis.CLR],
            [UDECAxis.GRD]: apiResponse.udec_scores[UDECAxis.GRD],
            [UDECAxis.SPC]: apiResponse.udec_scores[UDECAxis.SPC],
            [UDECAxis.IMG]: apiResponse.udec_scores[UDECAxis.IMG],
            [UDECAxis.MOT]: apiResponse.udec_scores[UDECAxis.MOT],
            [UDECAxis.ACC]: apiResponse.udec_scores[UDECAxis.ACC],
            [UDECAxis.RSP]: apiResponse.udec_scores[UDECAxis.RSP],
            [UDECAxis.TRD]: apiResponse.udec_scores[UDECAxis.TRD],
            [UDECAxis.EMO]: apiResponse.udec_scores[UDECAxis.EMO],
        },
        issuesFoundTotal: apiResponse.issues_found_total,
        teaserIssues: apiResponse.teaser_issues as DesignIssue[],
        fullIssues: apiResponse.full_issues as DesignIssue[],
        fixPacks: apiResponse.fix_packs,
        tokenChanges: apiResponse.token_changes,
        patchPlan: apiResponse.patch_plan,
    };
}

/**
 * Stream audit results (for real-time feedback)
 */
export async function streamAudit(input: AuditInput) {
    const modelTier = TASK_ROUTING[TaskRoute.UI_AUDIT_REASONING];
    const { model } = initModel({
        provider: modelTier.provider,
        model: modelTier.model as OPENROUTER_MODELS,
    });

    const systemPrompt = getCynthiaSystemPrompt();
    const userPrompt = buildAuditPrompt(input);

    return streamText({
        model,
        system: systemPrompt,
        prompt: userPrompt,
    });
}

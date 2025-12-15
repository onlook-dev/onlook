import { Icons } from '@onlook/ui/icons';
import type { EditorEngine } from '@onlook/web-client/src/components/store/editor/engine';
import { z } from 'zod';
import { ClientTool } from '../models/client';

export class CynthiaAuditTool extends ClientTool {
    static readonly toolName = 'cynthia_audit';
    static readonly description = 
        'Run a Cynthia design audit on the current UI. This performs a comprehensive UDEC analysis across 13 design axes (Context, Typography, Color, Spacing, Accessibility, etc.) and returns actionable fixes with severity ratings. Use this when the user asks to audit, review, or improve the design quality of their UI.';
    static readonly parameters = z.object({
        targetType: z.enum(['url', 'frame', 'component']).optional().describe('Type of target to audit. Defaults to current frame.'),
        targetValue: z.string().optional().describe('URL, frame ID, or component path. If not provided, audits the current view.'),
        context: z.object({
            productType: z.string().optional().describe('Type of product (e.g., SaaS, e-commerce, landing page)'),
            audience: z.string().optional().describe('Target audience (e.g., developers, consumers, enterprise)'),
            goal: z.string().optional().describe('Primary goal (e.g., conversion, engagement, information)'),
        }).optional(),
    });
    static readonly icon = Icons.Sparkles;

    async handle(
        params: z.infer<typeof CynthiaAuditTool.parameters>,
        editorEngine: EditorEngine,
    ): Promise<{
        success: boolean;
        message: string;
        auditId?: string;
        status?: string;
    }> {
        try {
            const projectId = editorEngine.project.id;
            if (!projectId) {
                return {
                    success: false,
                    message: 'No project found. Please open a project first.',
                };
            }

            // Get current frame URL if no target specified
            const targetType = params.targetType || 'frame';
            let targetValue = params.targetValue;

            if (!targetValue && targetType === 'frame') {
                // Get the current frame URL from the editor
                const currentUrl = editorEngine.sandbox.previewUrl;
                if (!currentUrl) {
                    return {
                        success: false,
                        message: 'No preview URL available. Please load a frame first.',
                    };
                }
                targetValue = currentUrl;
            }

            if (!targetValue) {
                return {
                    success: false,
                    message: 'No target specified for audit.',
                };
            }

            // Create audit via tRPC
            // Note: This assumes the tRPC client is available on editorEngine
            // In production, you'd need to pass this through or use a different mechanism
            const audit = await (editorEngine as any).trpc?.audit.create.mutate({
                projectId,
                targetType,
                targetValue,
                context: params.context,
            });

            if (!audit) {
                return {
                    success: false,
                    message: 'Failed to create audit.',
                };
            }

            return {
                success: true,
                message: `Cynthia audit started! Analyzing your UI across 13 design axes. Audit ID: ${audit.id}. Check the Audit tab for results.`,
                auditId: audit.id,
                status: audit.status,
            };
        } catch (error) {
            return {
                success: false,
                message: `Failed to start audit: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
        }
    }

    static getLabel(input?: z.infer<typeof CynthiaAuditTool.parameters>): string {
        if (input?.targetValue) {
            return `Running Cynthia audit on ${input.targetValue}`;
        }
        return 'Running Cynthia design audit';
    }
}

import { deployments, deploymentUpdateSchema, previewDomains, projectCustomDomains, projects, type Deployment } from '@onlook/db';
import type { DrizzleDb } from '@onlook/db/src/client';
import {
    DeploymentStatus,
    DeploymentType
} from '@onlook/models';
import { assertNever } from '@onlook/utility';
import { TRPCError } from '@trpc/server';
import { and, eq, ne } from 'drizzle-orm';
import { z } from "zod";

export async function getProjectUrls(db: DrizzleDb, projectId: string, type: DeploymentType): Promise<string[]> {
    let urls: string[] = [];
    if (type === DeploymentType.PREVIEW || type === DeploymentType.UNPUBLISH_PREVIEW) {
        const foundPreviewDomains = await db.query.previewDomains.findMany({
            where: eq(previewDomains.projectId, projectId),
        });
        if (!foundPreviewDomains || foundPreviewDomains.length === 0) {
            throw new TRPCError({
                code: 'BAD_REQUEST',
                message: 'No preview domain found',
            });
        }
        urls = foundPreviewDomains.map(domain => domain.fullDomain);
    } else if (type === DeploymentType.CUSTOM || type === DeploymentType.UNPUBLISH_CUSTOM) {
        const foundCustomDomains = await db.query.projectCustomDomains.findMany({
            where: eq(projectCustomDomains.projectId, projectId),
        });
        if (!foundCustomDomains || foundCustomDomains.length === 0) {
            throw new TRPCError({
                code: 'BAD_REQUEST',
                message: 'No custom domain found',
            });
        }
        urls = foundCustomDomains.map(domain => domain.fullDomain);
    } else {
        assertNever(type);
    }
    return urls;
}

export async function getSandboxId(db: DrizzleDb, projectId: string): Promise<string> {
    const project = await db.query.projects.findFirst({
        where: eq(projects.id, projectId),
    });
    if (!project) {
        throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Project not found',
        });
    }
    return project.sandboxId;
}

export async function updateDeployment(db: DrizzleDb, deploymentId: string, deployment: z.infer<typeof deploymentUpdateSchema>): Promise<Deployment | null> {
    try {
        const [result] = await db.update(deployments).set({
            ...deployment,
            type: deployment.type as DeploymentType,
            status: deployment.status as DeploymentStatus
        }).where(
            and(
                eq(deployments.id, deploymentId),
                ne(deployments.status, DeploymentStatus.CANCELLED)
            )
        ).returning();
        return result ?? null;
    } catch (error) {
        console.error(`Failed to update deployment ${deploymentId}:`, error);
        return null;
    }
}

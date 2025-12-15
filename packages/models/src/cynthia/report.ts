/**
 * Cynthia Audit Report Models
 */

import type { DesignIssue, UDECScores } from './udec';

export interface AuditInput {
    target: AuditTarget;
    context?: AuditContext;
    constraints?: AuditConstraints;
}

export interface AuditTarget {
    type: 'url' | 'screenshot' | 'frame' | 'component';
    value: string;
}

export interface AuditContext {
    productType?: string;
    audience?: string;
    goal?: string;
}

export interface AuditConstraints {
    brand?: Record<string, unknown>;
    stack?: string[];
    timeline?: string;
}

export interface CynthiaReport {
    id: string;
    product: string;
    version: string;
    overallScore: number;
    udecScores: UDECScores;
    issuesFoundTotal: number;
    teaserIssues: DesignIssue[];
    fullIssues?: DesignIssue[];
    fixPacks?: FixPack[];
    tokenChanges?: TokenChange[];
    patchPlan?: PatchPlan;
    createdAt: Date;
    projectId: string;
    userId: string;
}

export interface FixPack {
    id: string;
    name: string;
    description: string;
    category: 'layout' | 'typography' | 'color' | 'spacing' | 'motion' | 'accessibility';
    issues: string[];
    estimatedImpact: string;
    tradeoffs?: string[];
}

export interface TokenChange {
    type: 'color' | 'spacing' | 'typography' | 'motion';
    before: Record<string, unknown>;
    after: Record<string, unknown>;
    affectedComponents: string[];
}

export interface PatchPlan {
    reversible: boolean;
    changelog: ChangelogEntry[];
}

export interface ChangelogEntry {
    file: string;
    type: 'add' | 'modify' | 'delete';
    description: string;
    before?: string;
    after?: string;
}

export enum AuditStatus {
    PENDING = 'pending',
    RUNNING = 'running',
    COMPLETED = 'completed',
    FAILED = 'failed',
}

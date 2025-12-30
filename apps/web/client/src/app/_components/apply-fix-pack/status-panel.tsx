'use client';

import { useEffect } from 'react';
import { motion } from 'motion/react';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { api } from '@/trpc/react';
import { Badge } from '@onlook/ui/badge';

interface ApplyRunStatusPanelProps {
    applyRunId: string;
    autoRefresh?: boolean;
}

const STATUS_CONFIG = {
    queued: {
        icon: Icons.Clock,
        label: 'Queued',
        color: 'bg-gray-500',
        description: 'Waiting to start...',
    },
    running: {
        icon: Icons.Spinner,
        label: 'Running',
        color: 'bg-blue-500',
        description: 'Processing fix pack...',
    },
    branch_created: {
        icon: Icons.GitBranch,
        label: 'Branch Created',
        color: 'bg-blue-500',
        description: 'Git branch created',
    },
    pr_opened: {
        icon: Icons.GitPullRequest,
        label: 'PR Opened',
        color: 'bg-purple-500',
        description: 'Pull request created',
    },
    checks_running: {
        icon: Icons.CheckCircle2,
        label: 'CI Running',
        color: 'bg-yellow-500',
        description: 'Running CI checks...',
    },
    success: {
        icon: Icons.CheckCircle2,
        label: 'Success',
        color: 'bg-green-500',
        description: 'All checks passed!',
    },
    failed: {
        icon: Icons.XCircle,
        label: 'Failed',
        color: 'bg-red-500',
        description: 'Apply failed',
    },
} as const;

export function ApplyRunStatusPanel({
    applyRunId,
    autoRefresh = true,
}: ApplyRunStatusPanelProps) {
    const { data: applyRun, isLoading, refetch } = api.applyRun.getStatus.useQuery(
        { id: applyRunId },
        {
            refetchInterval: autoRefresh ? 3000 : false, // Poll every 3s
        }
    );

    // Stop polling when terminal status reached
    useEffect(() => {
        if (applyRun?.status === 'success' || applyRun?.status === 'failed') {
            // Stop auto-refresh
        }
    }, [applyRun?.status]);

    if (isLoading) {
        return (
            <div className="bg-background-secondary border border-border rounded-lg p-6">
                <div className="flex items-center gap-2">
                    <Icons.Spinner className="h-4 w-4 animate-spin" />
                    <p className="text-sm text-foreground-secondary">Loading status...</p>
                </div>
            </div>
        );
    }

    if (!applyRun) {
        return null;
    }

    const statusConfig = STATUS_CONFIG[applyRun.status as keyof typeof STATUS_CONFIG];
    const StatusIcon = statusConfig?.icon || Icons.HelpCircle;

    return (
        <motion.div
            className="bg-background-secondary border border-border rounded-lg overflow-hidden"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
        >
            {/* Header */}
            <div className="p-6 border-b border-border">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div
                            className={`p-2 rounded-full ${statusConfig?.color || 'bg-gray-500'}`}
                        >
                            <StatusIcon className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">
                                Apply Run Status
                            </h3>
                            <p className="text-sm text-foreground-secondary">
                                {statusConfig?.description || 'Processing...'}
                            </p>
                        </div>
                    </div>
                    <Badge variant="outline">{statusConfig?.label || applyRun.status}</Badge>
                </div>

                {/* Repository Info */}
                <div className="flex items-center gap-2 text-sm text-foreground-secondary">
                    <Icons.Github className="h-4 w-4" />
                    <span>
                        {applyRun.repoOwner}/{applyRun.repoName}
                    </span>
                    {applyRun.branch && (
                        <>
                            <Icons.GitBranch className="h-4 w-4 ml-2" />
                            <code className="text-xs bg-background px-2 py-1 rounded">
                                {applyRun.branch}
                            </code>
                        </>
                    )}
                </div>
            </div>

            {/* PR Link */}
            {applyRun.prUrl && (
                <div className="p-4 bg-background border-b border-border">
                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => window.open(applyRun.prUrl!, '_blank')}
                    >
                        <Icons.ExternalLink className="h-4 w-4 mr-2" />
                        View Pull Request #{applyRun.prNumber}
                    </Button>
                </div>
            )}

            {/* Error Message */}
            {applyRun.error && (
                <div className="p-4 bg-red-500/10 border-b border-border">
                    <div className="flex items-start gap-2">
                        <Icons.AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-red-500 mb-1">Error</p>
                            <p className="text-xs text-foreground-secondary">{applyRun.error}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Logs */}
            {applyRun.logs && Array.isArray(applyRun.logs) && applyRun.logs.length > 0 && (
                <div className="p-4">
                    <details className="group">
                        <summary className="cursor-pointer text-sm font-medium mb-2 flex items-center gap-2">
                            <Icons.ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
                            Execution Logs ({applyRun.logs.length})
                        </summary>
                        <div className="mt-2 space-y-1 max-h-64 overflow-y-auto">
                            {(applyRun.logs as Array<{ timestamp: string; level: string; message: string }>).map(
                                (log, index) => (
                                    <div
                                        key={index}
                                        className="flex items-start gap-2 text-xs font-mono"
                                    >
                                        <span className="text-foreground-secondary whitespace-nowrap">
                                            {new Date(log.timestamp).toLocaleTimeString()}
                                        </span>
                                        <span
                                            className={`
                                                ${log.level === 'error' ? 'text-red-500' : ''}
                                                ${log.level === 'warn' ? 'text-yellow-500' : ''}
                                                ${log.level === 'info' ? 'text-foreground-secondary' : ''}
                                            `}
                                        >
                                            {log.message}
                                        </span>
                                    </div>
                                )
                            )}
                        </div>
                    </details>
                </div>
            )}

            {/* Timestamps */}
            <div className="p-4 bg-background border-t border-border text-xs text-foreground-secondary">
                <div className="flex justify-between">
                    <span>Created: {new Date(applyRun.createdAt).toLocaleString()}</span>
                    <span>Updated: {new Date(applyRun.updatedAt).toLocaleString()}</span>
                </div>
            </div>
        </motion.div>
    );
}

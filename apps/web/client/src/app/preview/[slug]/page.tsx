'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { toast } from '@onlook/ui/sonner';
import { api } from '@/trpc/react';
import { WebsiteLayout } from '@/app/_components/website-layout';

export default function PreviewPage() {
    const params = useParams();
    const router = useRouter();
    const slug = params.slug as string;
    const [isPolling, setIsPolling] = useState(true);

    // First, resolve the slug to a build session
    const { data: previewData, isLoading: previewLoading, error: previewError } =
        api.preview.getBySlug.useQuery({ slug });

    // Then get the teaser data (with polling while audit runs)
    const { data: teaserData, isLoading: teaserLoading, refetch } =
        api.buildSession.getTeaser.useQuery(
            { previewSlug: slug },
            {
                enabled: !!previewData,
                refetchInterval: isPolling ? 3000 : false, // Poll every 3s while audit runs
            }
        );

    // Stop polling when audit completes
    useEffect(() => {
        if (teaserData?.auditStatus === 'completed' || teaserData?.auditStatus === 'failed') {
            setIsPolling(false);
        }
    }, [teaserData?.auditStatus]);

    const unlockMutation = api.audit.unlock.useMutation();

    const handleShare = async () => {
        const url = window.location.href;
        try {
            await navigator.clipboard.writeText(url);
            toast.success('Link copied to clipboard!');
        } catch {
            toast.error('Failed to copy link');
        }
    };

    const handleUnlock = async () => {
        if (!teaserData?.id) return;

        const result = await unlockMutation.mutateAsync({
            buildSessionId: teaserData.id
        });

        if (result.allowed) {
            // Redirect to full report
            router.push(`/audit/${teaserData.id}`);
        } else {
            toast.info(result.message, {
                description: 'Upgrade to unlock full report and fixes',
            });
        }
    };

    if (previewLoading || teaserLoading) {
        return (
            <WebsiteLayout showFooter={false}>
                <div className="min-h-screen flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <Icons.Spinner className="h-8 w-8 animate-spin text-foreground-secondary" />
                        <p className="text-foreground-secondary">Loading preview...</p>
                    </div>
                </div>
            </WebsiteLayout>
        );
    }

    if (previewError || !previewData || !teaserData) {
        return (
            <WebsiteLayout showFooter={false}>
                <div className="min-h-screen flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4 text-center max-w-md">
                        <Icons.AlertTriangle className="h-12 w-12 text-destructive" />
                        <h1 className="text-2xl font-bold">Preview Not Found</h1>
                        <p className="text-foreground-secondary">
                            {previewError?.message || 'This preview link is invalid or has expired.'}
                        </p>
                        <Button onClick={() => router.push('/')}>
                            <Icons.ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Home
                        </Button>
                    </div>
                </div>
            </WebsiteLayout>
        );
    }

    // Show progress if audit is still running
    if (teaserData.auditStatus !== 'completed') {
        const statusText = teaserData.auditStatus === 'pending'
            ? 'Starting audit...'
            : teaserData.auditStatus === 'running'
            ? 'Analyzing your UI...'
            : 'Processing...';

        const progress = teaserData.progress || 0;

        return (
            <WebsiteLayout showFooter={false}>
                <div className="min-h-screen py-12 px-4">
                    <div className="max-w-4xl mx-auto">
                        <motion.div
                            className="flex flex-col items-center justify-center min-h-[60vh] gap-6"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                        >
                            <Icons.Spinner className="h-16 w-16 animate-spin text-foreground-secondary" />
                            <div className="text-center">
                                <h1 className="text-3xl font-bold mb-2">Running Cynthia Audit</h1>
                                <p className="text-foreground-secondary mb-4">{statusText}</p>
                                <div className="w-64 h-2 bg-background-secondary rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-foreground-primary"
                                        initial={{ width: '0%' }}
                                        animate={{ width: `${progress}%` }}
                                        transition={{ duration: 0.5 }}
                                    />
                                </div>
                            </div>
                            <p className="text-sm text-foreground-secondary max-w-md text-center">
                                We're analyzing {teaserData.inputType === 'url' ? 'your URL' : 'your idea'} using the UDEC framework. This usually takes 30-60 seconds.
                            </p>
                        </motion.div>
                    </div>
                </div>
            </WebsiteLayout>
        );
    }

    // Show failed state
    if (teaserData.auditStatus === 'failed') {
        return (
            <WebsiteLayout showFooter={false}>
                <div className="min-h-screen flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4 text-center max-w-md">
                        <Icons.AlertTriangle className="h-12 w-12 text-destructive" />
                        <h1 className="text-2xl font-bold">Audit Failed</h1>
                        <p className="text-foreground-secondary">
                            We encountered an error while analyzing your UI. Please try again.
                        </p>
                        <Button onClick={() => router.push('/')}>
                            <Icons.ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Home
                        </Button>
                    </div>
                </div>
            </WebsiteLayout>
        );
    }

    // Audit completed - show teaser
    const teaserSummary = teaserData.teaserSummary as {
        issuesFound: number;
        teaserIssues: Array<{
            severity: string;
            axis: string;
            title: string;
            description: string;
            reason: string;
            impact: string;
        }>;
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical':
                return 'text-red-500';
            case 'high':
                return 'text-orange-500';
            case 'medium':
                return 'text-yellow-500';
            default:
                return 'text-foreground-secondary';
        }
    };

    return (
        <WebsiteLayout showFooter={false}>
            <div className="min-h-screen py-12 px-4">
                <div className="max-w-4xl mx-auto">
                    {/* Header with Share Button */}
                    <motion.div
                        className="flex items-center justify-between mb-8"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <div>
                            <h1 className="text-3xl font-bold">Your Cynthia Score</h1>
                            <p className="text-foreground-secondary mt-1">
                                {teaserData.inputType === 'url' ? 'URL' : 'Idea'}:{' '}
                                {teaserData.inputValue}
                            </p>
                        </div>
                        <Button onClick={handleShare} variant="outline" size="sm">
                            <Icons.Share className="h-4 w-4 mr-2" />
                            Share
                        </Button>
                    </motion.div>

                    {/* Score Card */}
                    <motion.div
                        className="bg-background-secondary border border-border rounded-lg p-8 mb-8"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 }}
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-foreground-secondary text-sm mb-2">
                                    Overall Score
                                </p>
                                <p className="text-6xl font-bold">
                                    {teaserData.teaserScore}
                                    <span className="text-2xl text-foreground-secondary">/100</span>
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-foreground-secondary text-sm mb-2">
                                    Issues Found
                                </p>
                                <p className="text-4xl font-bold text-orange-500">
                                    {teaserSummary.issuesFound}
                                </p>
                            </div>
                        </div>
                    </motion.div>

                    {/* Teaser Issues */}
                    <motion.div
                        className="space-y-4 mb-8"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        <h2 className="text-xl font-bold">Sample Issues (Preview)</h2>
                        {teaserSummary.teaserIssues.map((issue, index) => (
                            <motion.div
                                key={index}
                                className="bg-background-secondary border border-border rounded-lg p-6"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 + index * 0.1 }}
                            >
                                <div className="flex items-start gap-4">
                                    <div className="flex-shrink-0">
                                        <span
                                            className={`inline-block px-2 py-1 rounded text-xs font-mono uppercase ${getSeverityColor(issue.severity)}`}
                                        >
                                            {issue.severity}
                                        </span>
                                        <span className="ml-2 text-xs font-mono text-foreground-secondary">
                                            {issue.axis}
                                        </span>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold mb-2">{issue.title}</h3>
                                        <p className="text-sm text-foreground-secondary mb-2">
                                            {issue.description}
                                        </p>
                                        <div className="space-y-1 text-sm">
                                            <p>
                                                <span className="text-foreground-secondary">
                                                    Reason:
                                                </span>{' '}
                                                {issue.reason}
                                            </p>
                                            <p>
                                                <span className="text-foreground-secondary">
                                                    Impact:
                                                </span>{' '}
                                                {issue.impact}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>

                    {/* Unlock CTA */}
                    <motion.div
                        className="bg-gradient-to-br from-background-secondary to-background border border-border rounded-lg p-8 text-center"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                    >
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent blur-sm" />
                            <div className="relative">
                                <Icons.Lock className="h-12 w-12 mx-auto mb-4 text-foreground-secondary" />
                                <h3 className="text-2xl font-bold mb-2">
                                    Unlock Full Report & Fixes
                                </h3>
                                <p className="text-foreground-secondary mb-6 max-w-lg mx-auto">
                                    Get all {teaserSummary.issuesFound} issues, fix packs, design
                                    tokens, and GitHub deployment.
                                </p>
                                <Button
                                    onClick={handleUnlock}
                                    size="lg"
                                    disabled={unlockMutation.isPending}
                                >
                                    {unlockMutation.isPending ? (
                                        <>
                                            <Icons.Spinner className="h-4 w-4 mr-2 animate-spin" />
                                            Checking...
                                        </>
                                    ) : (
                                        <>
                                            Unlock Now
                                            <Icons.ArrowRight className="h-4 w-4 ml-2" />
                                        </>
                                    )}
                                </Button>
                                <p className="text-xs text-foreground-secondary mt-4">
                                    No signup to start. Preview first. Upgrade when you're ready.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </WebsiteLayout>
    );
}

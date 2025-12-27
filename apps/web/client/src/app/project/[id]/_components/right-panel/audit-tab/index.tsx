'use client';

import { useState } from 'react';
import { Button } from '@onlook/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@onlook/ui/card';
import { Badge } from '@onlook/ui/badge';
import { Separator } from '@onlook/ui/separator';
import { Icons } from '@onlook/ui/icons';
import { api } from '@/trpc/react';
import { AuditStatus, IssueSeverity, UDECAxis } from '@onlook/models';

interface AuditTabProps {
    projectId: string;
}

export function AuditTab({ projectId }: AuditTabProps) {
    const [targetUrl, setTargetUrl] = useState('');
    const [currentAuditId, setCurrentAuditId] = useState<string | null>(null);

    const createAudit = api.audit.create.useMutation();
    const { data: audit, refetch } = api.audit.get.useQuery(
        { id: currentAuditId! },
        { enabled: !!currentAuditId, refetchInterval: 2000 }
    );
    const { data: teaserReport } = api.audit.getTeaser.useQuery(
        { id: currentAuditId! },
        { enabled: !!currentAuditId && audit?.status === AuditStatus.COMPLETED }
    );

    const handleStartAudit = async () => {
        if (!targetUrl) return;

        const result = await createAudit.mutateAsync({
            projectId,
            targetType: 'url',
            targetValue: targetUrl,
        });

        setCurrentAuditId(result.id);
    };

    const getSeverityColor = (severity: IssueSeverity) => {
        switch (severity) {
            case IssueSeverity.CRITICAL:
                return 'destructive';
            case IssueSeverity.MAJOR:
                return 'warning';
            case IssueSeverity.MINOR:
                return 'secondary';
            default:
                return 'default';
        }
    };

    const getAxisLabel = (axis: UDECAxis) => {
        const labels = {
            [UDECAxis.CTX]: 'Context & Clarity',
            [UDECAxis.DYN]: 'Dynamic',
            [UDECAxis.LFT]: 'Layout & Flow',
            [UDECAxis.TYP]: 'Typography',
            [UDECAxis.CLR]: 'Color',
            [UDECAxis.GRD]: 'Grid',
            [UDECAxis.SPC]: 'Spacing',
            [UDECAxis.IMG]: 'Imagery',
            [UDECAxis.MOT]: 'Motion',
            [UDECAxis.ACC]: 'Accessibility',
            [UDECAxis.RSP]: 'Responsive',
            [UDECAxis.TRD]: 'Trends',
            [UDECAxis.EMO]: 'Emotional Impact',
        };
        return labels[axis] || axis;
    };

    return (
        <div className="flex h-full flex-col gap-4 p-4">
            <div className="space-y-2">
                <h2 className="text-xl font-bold">Cynthia Design Audit</h2>
                <p className="text-sm text-muted-foreground">
                    AI-powered design audit with actionable fixes
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Start New Audit</CardTitle>
                    <CardDescription>
                        Enter a URL or select a component to audit
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <input
                        type="url"
                        placeholder="https://example.com"
                        value={targetUrl}
                        onChange={(e) => setTargetUrl(e.target.value)}
                        className="w-full rounded-md border border-input bg-background px-3 py-2"
                    />
                    <Button
                        onClick={handleStartAudit}
                        disabled={!targetUrl || createAudit.isPending}
                        className="w-full"
                    >
                        {createAudit.isPending ? (
                            <>
                                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                                Starting...
                            </>
                        ) : (
                            'Run Audit'
                        )}
                    </Button>
                </CardContent>
            </Card>

            {audit && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span>Audit Status</span>
                            <Badge variant={audit.status === AuditStatus.COMPLETED ? 'default' : 'secondary'}>
                                {audit.status}
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {audit.status === AuditStatus.RUNNING && (
                            <div className="flex items-center gap-2">
                                <Icons.spinner className="h-4 w-4 animate-spin" />
                                <span>Analyzing your UI...</span>
                            </div>
                        )}
                        {audit.status === AuditStatus.FAILED && (
                            <div className="text-destructive">
                                Audit failed: {audit.errorMessage}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {teaserReport && teaserReport.status === AuditStatus.COMPLETED && (
                <>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <span>Cynthia Score</span>
                                <div className="text-4xl font-bold">{teaserReport.overallScore}</div>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">
                                Found {teaserReport.issuesFoundTotal} issues
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Top Issues (Teaser)</CardTitle>
                            <CardDescription>
                                Unlock full report for complete details and fix packs
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {teaserReport.teaserIssues?.map((issue: any) => (
                                <div key={issue.id} className="space-y-2 rounded-lg border p-4">
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Badge variant={getSeverityColor(issue.severity)}>
                                                    {issue.severity}
                                                </Badge>
                                                <Badge variant="outline">{getAxisLabel(issue.axis)}</Badge>
                                            </div>
                                            <h4 className="font-semibold">{issue.title}</h4>
                                        </div>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{issue.description}</p>
                                    <div className="space-y-1">
                                        <p className="text-sm">
                                            <strong>Why it matters:</strong> {issue.reason}
                                        </p>
                                        <p className="text-sm">
                                            <strong>Impact:</strong> {issue.impact}
                                        </p>
                                    </div>
                                    <Separator />
                                    <div className="space-y-1">
                                        <p className="text-sm font-semibold">Fix:</p>
                                        <p className="text-sm">{issue.fix.description}</p>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card className="border-primary">
                        <CardHeader>
                            <CardTitle>Unlock Full Report</CardTitle>
                            <CardDescription>
                                Get the complete fix plan + one-click refactors
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <ul className="space-y-2 text-sm">
                                <li className="flex items-center gap-2">
                                    <Icons.check className="h-4 w-4 text-primary" />
                                    Full UDEC breakdown with exact measurements
                                </li>
                                <li className="flex items-center gap-2">
                                    <Icons.check className="h-4 w-4 text-primary" />
                                    One-click Fix Packs (layout, type, color, spacing, accessibility)
                                </li>
                                <li className="flex items-center gap-2">
                                    <Icons.check className="h-4 w-4 text-primary" />
                                    Exportable patch + changelog for your repo
                                </li>
                            </ul>
                            <Button className="w-full" variant="default">
                                Upgrade to Pro
                            </Button>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}

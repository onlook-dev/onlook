'use client';

import { api } from '@/trpc/react';
import { Avatar, AvatarFallback, AvatarImage } from '@onlook/ui/avatar';
import { Badge } from '@onlook/ui/badge';
import { Button } from '@onlook/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@onlook/ui/card';
import { Skeleton } from '@onlook/ui/skeleton';
import { ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { EditRateLimit } from './edit-rate-limit';

interface UserDetailProps {
    userId: string;
}

export function UserDetail({ userId }: UserDetailProps) {
    const router = useRouter();
    const [isProjectsExpanded, setIsProjectsExpanded] = useState(false);
    const { data: user, isLoading, error } = api.users.getById.useQuery(userId);

    if (error) {
        return (
            <Card className="border-destructive/50">
                <CardHeader>
                    <CardTitle className="text-destructive">Error Loading User</CardTitle>
                    <CardDescription>{error.message}</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    if (isLoading || !user) {
        return (
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <Skeleton className="h-8 w-64" />
                        <Skeleton className="h-4 w-48 mt-2" />
                    </CardHeader>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* User Info */}
            <Card>
                <CardHeader>
                    <div className="flex items-start gap-4">
                        <Avatar className="size-16">
                            <AvatarImage src={user.avatarUrl || undefined} />
                            <AvatarFallback className="text-2xl">
                                {user.name?.[0]?.toUpperCase() || 'U'}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <CardTitle className="text-2xl">{user.name}</CardTitle>
                            <CardDescription className="mt-1">{user.email}</CardDescription>
                            <CardDescription className="mt-1 text-xs">
                                User ID: {user.id}
                            </CardDescription>
                            <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                                {user.createdAt && (
                                    <span>
                                        Joined: {new Date(user.createdAt).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric',
                                        })}
                                    </span>
                                )}
                                {user.updatedAt && (
                                    <span>
                                        Updated: {new Date(user.updatedAt).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric',
                                        })}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Stripe Customer ID</p>
                            {user.stripeCustomerId ? (
                                <Button
                                    variant="link"
                                    className="h-auto p-0 text-sm font-mono mt-1"
                                    onClick={() => window.open(`https://dashboard.stripe.com/customers/${user.stripeCustomerId}`, '_blank')}
                                >
                                    {user.stripeCustomerId}
                                    <ExternalLink className="ml-1 size-3" />
                                </Button>
                            ) : (
                                <p className="text-sm font-mono mt-1">—</p>
                            )}
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">GitHub Installation ID</p>
                            <p className="text-sm font-mono mt-1">
                                {user.githubInstallationId || '—'}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Projects */}
            <Card>
                <CardHeader className="cursor-pointer" onClick={() => setIsProjectsExpanded(!isProjectsExpanded)}>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                Projects
                                {isProjectsExpanded ? (
                                    <ChevronDown className="size-4" />
                                ) : (
                                    <ChevronRight className="size-4" />
                                )}
                            </CardTitle>
                            <CardDescription>
                                {user.projects.length} project{user.projects.length !== 1 ? 's' : ''} with access
                            </CardDescription>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsProjectsExpanded(!isProjectsExpanded);
                            }}
                        >
                            {isProjectsExpanded ? 'Collapse' : 'Expand'}
                        </Button>
                    </div>
                </CardHeader>
                {isProjectsExpanded && (
                    <CardContent>
                        {user.projects.length > 0 ? (
                            <div className="space-y-2">
                                {user.projects.map((project) => (
                                    <div
                                        key={project.id}
                                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Avatar className="size-10">
                                                <AvatarImage src={project.previewImgUrl || undefined} />
                                                <AvatarFallback>
                                                    {project.name?.[0]?.toUpperCase() || 'P'}
                                                </AvatarFallback>
                                            </Avatar>
                                            <button
                                                className="font-medium hover:text-primary hover:underline cursor-pointer text-left"
                                                onClick={() => router.push(`/projects/${project.id}`)}
                                            >
                                                {project.name}
                                            </button>
                                        </div>
                                        <Badge variant="outline">{project.role}</Badge>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">No projects found</p>
                        )}
                    </CardContent>
                )}
            </Card>

            {/* Subscriptions */}
            <Card>
                <CardHeader>
                    <CardTitle>Subscriptions</CardTitle>
                    <CardDescription>
                        {user.subscriptions.length} active subscription{user.subscriptions.length !== 1 ? 's' : ''}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {user.subscriptions.length > 0 ? (
                        <div className="space-y-3">
                            {user.subscriptions.map((subscription) => (
                                <div
                                    key={subscription.id}
                                    className="p-4 border rounded-lg space-y-2"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium">{subscription.productName}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {subscription.priceKey} ({subscription.monthlyMessageLimit} messages/month)
                                            </p>
                                        </div>
                                        <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
                                            {subscription.status}
                                        </Badge>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div>
                                            <p className="text-muted-foreground">Period Start</p>
                                            <p className="font-mono text-xs">
                                                {new Date(subscription.stripeCurrentPeriodStart).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric',
                                                })}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Period End</p>
                                            <p className="font-mono text-xs">
                                                {new Date(subscription.stripeCurrentPeriodEnd).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric',
                                                })}
                                            </p>
                                        </div>
                                        <div className="col-span-2">
                                            <p className="text-muted-foreground">Stripe Subscription ID</p>
                                            <p className="font-mono text-xs">{subscription.stripeSubscriptionId}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">No active subscriptions</p>
                    )}
                </CardContent>
            </Card>

            {/* Rate Limits */}
            <Card>
                <CardHeader>
                    <CardTitle>Rate Limits</CardTitle>
                    <CardDescription>
                        Current and historical rate limit information
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {user.rateLimits.length > 0 ? (
                        <div className="space-y-3">
                            {user.rateLimits.map((rateLimit) => {
                                const isActive = new Date() >= new Date(rateLimit.startedAt) &&
                                               new Date() <= new Date(rateLimit.endedAt);
                                const usagePercent = ((rateLimit.max - rateLimit.left) / rateLimit.max) * 100;

                                return (
                                    <div
                                        key={rateLimit.id}
                                        className="p-4 border rounded-lg space-y-3"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-medium">
                                                        {rateLimit.max - rateLimit.left} / {rateLimit.max} used
                                                    </p>
                                                    {isActive && <Badge variant="default">Active</Badge>}
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    {rateLimit.left} requests remaining
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {rateLimit.carryOverTotal > 0 && (
                                                    <Badge variant="outline">
                                                        Carried over {rateLimit.carryOverTotal}x
                                                    </Badge>
                                                )}
                                                {isActive && (
                                                    <EditRateLimit
                                                        rateLimitId={rateLimit.id}
                                                        currentLeft={rateLimit.left}
                                                        max={rateLimit.max}
                                                        userId={userId}
                                                    />
                                                )}
                                            </div>
                                        </div>

                                        {/* Progress bar */}
                                        <div className="space-y-1">
                                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-primary transition-all"
                                                    style={{ width: `${usagePercent}%` }}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            <div>
                                                <p className="text-muted-foreground">Period Start</p>
                                                <p className="font-mono text-xs">
                                                    {new Date(rateLimit.startedAt).toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        year: 'numeric',
                                                    })}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground">Period End</p>
                                                <p className="font-mono text-xs">
                                                    {new Date(rateLimit.endedAt).toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        year: 'numeric',
                                                    })}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">No rate limit data available</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

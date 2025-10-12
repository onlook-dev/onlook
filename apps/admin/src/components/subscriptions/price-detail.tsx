'use client';

import { api } from '@/trpc/react';
import { Badge } from '@onlook/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@onlook/ui/card';
import { Skeleton } from '@onlook/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@onlook/ui/table';
import { ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@onlook/ui/button';

interface PriceDetailProps {
    priceId: string;
}

export function PriceDetail({ priceId }: PriceDetailProps) {
    const router = useRouter();
    const { data, isLoading, error } = api.subscriptions.getPriceDetail.useQuery({ priceId });

    if (error) {
        return (
            <Card className="border-destructive/50">
                <CardHeader>
                    <CardTitle className="text-destructive">Error Loading Price Details</CardTitle>
                    <CardDescription>{error.message}</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    if (isLoading || !data) {
        return (
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-4 w-64 mt-2" />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-full" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-32" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-64 w-full" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Price Info Card */}
            <Card>
                <CardHeader>
                    <CardTitle>{data.price.key}</CardTitle>
                    <CardDescription>
                        {data.price.monthlyMessageLimit.toLocaleString()} messages per month
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Product</p>
                        <p className="text-sm">{data.price.productName}</p>
                        <Button
                            variant="link"
                            className="h-auto p-0 text-xs font-mono mt-1"
                            onClick={() => window.open(`https://dashboard.stripe.com/products/${data.price.stripeProductId}`, '_blank')}
                        >
                            {data.price.stripeProductId}
                            <ExternalLink className="ml-1 size-3" />
                        </Button>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Stripe Price ID</p>
                        <Button
                            variant="link"
                            className="h-auto p-0 text-xs font-mono"
                            onClick={() => window.open(`https://dashboard.stripe.com/prices/${data.price.stripePriceId}`, '_blank')}
                        >
                            {data.price.stripePriceId}
                            <ExternalLink className="ml-1 size-3" />
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Subscribers Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Subscribers</CardTitle>
                    <CardDescription>
                        {data.users.length} {data.users.length === 1 ? 'user' : 'users'} subscribed to this plan
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {data.users.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No users subscribed to this plan yet
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Started</TableHead>
                                    <TableHead>Current Period</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.users.map((user) => (
                                    <TableRow
                                        key={user.subscriptionId}
                                        className="cursor-pointer"
                                        onClick={() => router.push(`/users/${user.userId}`)}
                                    >
                                        <TableCell>
                                            <div>
                                                <p className="font-medium">{user.userName}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {user.userEmail}
                                                </p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={user.subscriptionStatus === 'active' ? 'default' : 'secondary'}>
                                                {user.subscriptionStatus}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <p className="text-sm">
                                                {new Date(user.startedAt).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric',
                                                })}
                                            </p>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm">
                                                <p>
                                                    {new Date(user.stripeCurrentPeriodStart).toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                    })}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    to {new Date(user.stripeCurrentPeriodEnd).toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        year: 'numeric',
                                                    })}
                                                </p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

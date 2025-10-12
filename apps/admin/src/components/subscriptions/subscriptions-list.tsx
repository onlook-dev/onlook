'use client';

import { api } from '@/trpc/react';
import { Badge } from '@onlook/ui/badge';
import { Button } from '@onlook/ui/button';
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
import { ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type SortBy = 'startedAt' | 'priceKey' | 'status';
type SortOrder = 'asc' | 'desc';

export function SubscriptionsList() {
    const router = useRouter();
    const [page, setPage] = useState(1);
    const [pageSize] = useState(20);
    const [sortBy, setSortBy] = useState<SortBy>('startedAt');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

    const { data, isLoading, error } = api.subscriptions.listSubscriptions.useQuery({
        page,
        pageSize,
        sortBy,
        sortOrder,
    });

    const handleSort = (column: SortBy) => {
        if (sortBy === column) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortOrder('desc');
        }
        setPage(1); // Reset to first page when sorting changes
    };

    if (error) {
        return (
            <Card className="border-destructive/50">
                <CardHeader>
                    <CardTitle className="text-destructive">Error Loading Subscriptions</CardTitle>
                    <CardDescription>{error.message}</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>All Subscriptions</CardTitle>
                <CardDescription>
                    {data ? `${data.pagination.totalCount} total subscriptions` : 'Loading...'}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead>Product</TableHead>
                                <TableHead>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="-ml-3 h-8 data-[state=open]:bg-accent"
                                        onClick={() => handleSort('priceKey')}
                                    >
                                        Plan
                                        <ArrowUpDown className="ml-2 size-4" />
                                    </Button>
                                </TableHead>
                                <TableHead>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="-ml-3 h-8 data-[state=open]:bg-accent"
                                        onClick={() => handleSort('status')}
                                    >
                                        Status
                                        <ArrowUpDown className="ml-2 size-4" />
                                    </Button>
                                </TableHead>
                                <TableHead>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="-ml-3 h-8 data-[state=open]:bg-accent"
                                        onClick={() => handleSort('startedAt')}
                                    >
                                        Period
                                        <ArrowUpDown className="ml-2 size-4" />
                                    </Button>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                    </TableRow>
                                ))
                            ) : data?.subscriptions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        <div className="text-muted-foreground">
                                            No subscriptions found
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data?.subscriptions.map((subscription) => (
                                    <TableRow
                                        key={subscription.id}
                                        className="cursor-pointer"
                                        onClick={() => router.push(`/users/${subscription.userId}`)}
                                    >
                                        <TableCell>
                                            <div>
                                                <p className="font-medium">{subscription.userName}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {subscription.userEmail}
                                                </p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <p className="font-medium">{subscription.productName}</p>
                                        </TableCell>
                                        <TableCell>
                                            <div>
                                                <p className="text-sm">{subscription.priceKey}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {subscription.monthlyMessageLimit.toLocaleString()} msgs/mo
                                                </p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
                                                {subscription.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm">
                                                <p>
                                                    {new Date(subscription.stripeCurrentPeriodStart).toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                    })}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    to {new Date(subscription.stripeCurrentPeriodEnd).toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        year: 'numeric',
                                                    })}
                                                </p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>

                    {data && data.pagination.totalPages > 1 && (
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-muted-foreground">
                                Page {data.pagination.page} of {data.pagination.totalPages}
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={!data.pagination.hasPrev}
                                >
                                    <ChevronLeft className="size-4" />
                                    Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage((p) => p + 1)}
                                    disabled={!data.pagination.hasNext}
                                >
                                    Next
                                    <ChevronRight className="size-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

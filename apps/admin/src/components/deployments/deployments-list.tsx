'use client';

import { api } from '@/trpc/react';
import { Badge } from '@onlook/ui/badge';
import { Button } from '@onlook/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@onlook/ui/card';
import { Input } from '@onlook/ui/input';
import { Skeleton } from '@onlook/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@onlook/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { ArrowUpDown, ChevronLeft, ChevronRight, Code2, ExternalLink, MonitorPlay, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type SortBy = 'createdAt' | 'status' | 'type';
type SortOrder = 'asc' | 'desc';

export function DeploymentsList() {
    const router = useRouter();
    const [page, setPage] = useState(1);
    const [pageSize] = useState(20);
    const [sortBy, setSortBy] = useState<SortBy>('createdAt');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
    const [search, setSearch] = useState('');

    const { data, isLoading, error } = api.deployments.list.useQuery({
        page,
        pageSize,
        sortBy,
        sortOrder,
        search,
    });

    const handleSort = (column: SortBy) => {
        if (sortBy === column) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortOrder('desc');
        }
        setPage(1);
    };

    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'completed':
                return 'default';
            case 'in_progress':
                return 'secondary';
            case 'failed':
                return 'destructive';
            case 'cancelled':
                return 'outline';
            default:
                return 'secondary';
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'preview':
                return 'Preview';
            case 'custom':
                return 'Custom';
            case 'unpublish_preview':
                return 'Unpublish Preview';
            case 'unpublish_custom':
                return 'Unpublish Custom';
            default:
                return type;
        }
    };

    if (error) {
        return (
            <Card className="border-destructive/50">
                <CardHeader>
                    <CardTitle className="text-destructive">Error Loading Deployments</CardTitle>
                    <CardDescription>{error.message}</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>All Deployments</CardTitle>
                <CardDescription>
                    {data ? `${data.pagination.totalCount} total deployments` : 'Loading...'}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {/* Search */}
                    <div className="flex items-center gap-2">
                        <Search className="size-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by project, user, or deployment ID..."
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                            className="max-w-md"
                        />
                    </div>

                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Project</TableHead>
                                <TableHead>Sandbox</TableHead>
                                <TableHead>Requested By</TableHead>
                                <TableHead>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="-ml-3 h-8 data-[state=open]:bg-accent"
                                        onClick={() => handleSort('type')}
                                    >
                                        Type
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
                                <TableHead>URLs</TableHead>
                                <TableHead>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="-ml-3 h-8 data-[state=open]:bg-accent"
                                        onClick={() => handleSort('createdAt')}
                                    >
                                        Created
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
                                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                    </TableRow>
                                ))
                            ) : data?.deployments.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">
                                        <div className="text-muted-foreground">
                                            No deployments found
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data?.deployments.map((deployment) => (
                                    <TableRow
                                        key={deployment.id}
                                        className="cursor-pointer"
                                        onClick={() => router.push(`/projects/${deployment.projectId}`)}
                                    >
                                        <TableCell>
                                            <p className="font-medium">{deployment.projectName}</p>
                                        </TableCell>
                                        <TableCell>
                                            {deployment.sandboxId ? (
                                                <div className="flex items-center gap-2">
                                                    <p className="text-xs text-muted-foreground font-mono">
                                                        {deployment.sandboxId}
                                                    </p>
                                                    <div className="flex gap-1">
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-6 w-6 p-0"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        window.open(`https://codesandbox.io/s/${deployment.sandboxId}`, '_blank');
                                                                    }}
                                                                >
                                                                    <Code2 className="size-3" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p className="text-xs">
                                                                    https://codesandbox.io/s/{deployment.sandboxId}
                                                                </p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-6 w-6 p-0"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        window.open(`https://${deployment.sandboxId}-3000.csb.app`, '_blank');
                                                                    }}
                                                                >
                                                                    <MonitorPlay className="size-3" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p className="text-xs">
                                                                    https://{deployment.sandboxId}-3000.csb.app
                                                                </p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div
                                                className="cursor-pointer hover:underline"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    router.push(`/users/${deployment.requestedById}`);
                                                }}
                                            >
                                                <p className="font-medium">{deployment.requestedByName}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {deployment.requestedByEmail}
                                                </p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{getTypeLabel(deployment.type)}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div>
                                                <Badge variant={getStatusVariant(deployment.status)}>
                                                    {deployment.status}
                                                </Badge>
                                                {deployment.progress !== null && deployment.status === 'in_progress' && (
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {deployment.progress}%
                                                    </p>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {deployment.urls && deployment.urls.length > 0 ? (
                                                <div className="flex flex-col gap-1">
                                                    {deployment.urls.slice(0, 2).map((url, idx) => (
                                                        <Button
                                                            key={idx}
                                                            variant="link"
                                                            size="sm"
                                                            className="h-auto p-0 text-xs justify-start"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                window.open(url, '_blank');
                                                            }}
                                                        >
                                                            {url.length > 30 ? url.substring(0, 30) + '...' : url}
                                                            <ExternalLink className="ml-1 size-3" />
                                                        </Button>
                                                    ))}
                                                    {deployment.urls.length > 2 && (
                                                        <span className="text-xs text-muted-foreground">
                                                            +{deployment.urls.length - 2} more
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <p className="text-sm">
                                                {new Date(deployment.createdAt).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric',
                                                })}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {new Date(deployment.createdAt).toLocaleTimeString('en-US', {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </p>
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

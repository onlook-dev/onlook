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
import { ArrowUpDown, CheckCircle2, ChevronLeft, ChevronRight, ExternalLink, Search, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type SortBy = 'createdAt' | 'verified' | 'apexDomain';
type SortOrder = 'asc' | 'desc';

export function DomainsList() {
    const router = useRouter();
    const [page, setPage] = useState(1);
    const [pageSize] = useState(20);
    const [sortBy, setSortBy] = useState<SortBy>('verified');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
    const [search, setSearch] = useState('');

    const { data, isLoading, error } = api.domains.listCustomDomains.useQuery({
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

    if (error) {
        return (
            <Card className="border-destructive/50">
                <CardHeader>
                    <CardTitle className="text-destructive">Error Loading Domains</CardTitle>
                    <CardDescription>{error.message}</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Custom Domains</CardTitle>
                <CardDescription>
                    {data ? `${data.pagination.totalCount} total domains` : 'Loading...'}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {/* Search */}
                    <div className="flex items-center gap-2">
                        <Search className="size-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by domain or ID..."
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
                                <TableHead>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="-ml-3 h-8 data-[state=open]:bg-accent"
                                        onClick={() => handleSort('apexDomain')}
                                    >
                                        Domain
                                        <ArrowUpDown className="ml-2 size-4" />
                                    </Button>
                                </TableHead>
                                <TableHead>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="-ml-3 h-8 data-[state=open]:bg-accent"
                                        onClick={() => handleSort('verified')}
                                    >
                                        Verified
                                        <ArrowUpDown className="ml-2 size-4" />
                                    </Button>
                                </TableHead>
                                <TableHead>Owner</TableHead>
                                <TableHead>Projects Using Domain</TableHead>
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
                                        <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                    </TableRow>
                                ))
                            ) : data?.domains.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        <div className="text-muted-foreground">
                                            No custom domains found
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data?.domains.map((domain) => (
                                    <TableRow key={domain.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="link"
                                                    className="h-auto p-0 font-mono"
                                                    onClick={() => window.open(`https://${domain.apexDomain}`, '_blank')}
                                                >
                                                    {domain.apexDomain}
                                                    <ExternalLink className="ml-1 size-3" />
                                                </Button>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                ID: {domain.id}
                                            </p>
                                        </TableCell>
                                        <TableCell>
                                            {domain.verified ? (
                                                <Badge variant="default" className="gap-1">
                                                    <CheckCircle2 className="size-3" />
                                                    Verified
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary" className="gap-1">
                                                    <XCircle className="size-3" />
                                                    Unverified
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {domain.projects.length > 0 && domain.projects[0] ? (
                                                <div
                                                    className="cursor-pointer hover:underline"
                                                    onClick={() => router.push(`/users/${domain.projects[0]!.ownerId}`)}
                                                >
                                                    <p className="font-medium text-sm">{domain.projects[0]!.ownerName}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {domain.projects[0]!.ownerEmail}
                                                    </p>
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {domain.projects.length > 0 ? (
                                                <div className="space-y-1">
                                                    {domain.projects.slice(0, 3).map((project) => (
                                                        <div
                                                            key={project.projectId}
                                                            className="flex items-center gap-2"
                                                        >
                                                            <Button
                                                                variant="link"
                                                                size="sm"
                                                                className="h-auto p-0 text-xs"
                                                                onClick={() => router.push(`/projects/${project.projectId}`)}
                                                            >
                                                                {project.projectName}
                                                            </Button>
                                                            <Badge
                                                                variant={project.status === 'active' ? 'default' : 'secondary'}
                                                                className="text-xs"
                                                            >
                                                                {project.status}
                                                            </Badge>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-auto p-0"
                                                                onClick={() => window.open(`https://${project.fullDomain}`, '_blank')}
                                                            >
                                                                <span className="text-xs text-muted-foreground font-mono">
                                                                    {project.fullDomain}
                                                                </span>
                                                                <ExternalLink className="ml-1 size-3" />
                                                            </Button>
                                                        </div>
                                                    ))}
                                                    {domain.projects.length > 3 && (
                                                        <span className="text-xs text-muted-foreground">
                                                            +{domain.projects.length - 3} more
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <p className="text-sm">
                                                {new Date(domain.createdAt).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric',
                                                })}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {new Date(domain.createdAt).toLocaleTimeString('en-US', {
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

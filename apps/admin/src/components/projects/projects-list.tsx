'use client';

import { api } from '@/trpc/react';
import { Avatar, AvatarFallback, AvatarImage } from '@onlook/ui/avatar';
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
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@onlook/ui/tooltip';
import { ArrowUpDown, ChevronLeft, ChevronRight, Code2, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function ProjectsList() {
    const router = useRouter();
    const [page, setPage] = useState(1);
    const [pageSize] = useState(20);
    const [sortBy, setSortBy] = useState<'updated_at' | 'created_at' | 'name'>('updated_at');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    const { data, isLoading, error } = api.projects.list.useQuery({
        page,
        pageSize,
        sortBy,
        sortOrder,
    });

    const handleSort = (column: 'updated_at' | 'created_at' | 'name') => {
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
                    <CardTitle className="text-destructive">Error Loading Projects</CardTitle>
                    <CardDescription>{error.message}</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Projects</CardTitle>
                <CardDescription>
                    {data ? `${data.pagination.totalCount} total projects` : 'Loading...'}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleSort('name')}
                                        className="flex items-center gap-1 -ml-3 h-8"
                                    >
                                        Name
                                        <ArrowUpDown className="size-3" />
                                    </Button>
                                </TableHead>
                                <TableHead>Sandboxes</TableHead>
                                <TableHead>Users</TableHead>
                                <TableHead>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleSort('created_at')}
                                        className="flex items-center gap-1 -ml-3 h-8"
                                    >
                                        Created
                                        <ArrowUpDown className="size-3" />
                                    </Button>
                                </TableHead>
                                <TableHead>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleSort('updated_at')}
                                        className="flex items-center gap-1 -ml-3 h-8"
                                    >
                                        Last Updated
                                        <ArrowUpDown className="size-3" />
                                    </Button>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Skeleton className="size-10 rounded-full" />
                                                <Skeleton className="h-4 w-32" />
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Skeleton className="h-4 w-24" />
                                        </TableCell>
                                        <TableCell>
                                            <Skeleton className="h-4 w-32" />
                                        </TableCell>
                                        <TableCell>
                                            <Skeleton className="h-4 w-24" />
                                        </TableCell>
                                        <TableCell>
                                            <Skeleton className="h-4 w-24" />
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : data?.projects.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        <div className="text-muted-foreground">
                                            No projects found
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data?.projects.map((project) => (
                                    <TableRow
                                        key={project.id}
                                        className="cursor-pointer"
                                        onClick={() => router.push(`/projects/${project.id}`)}
                                    >
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="size-10">
                                                    <AvatarImage src={project.previewImgUrl || undefined} />
                                                    <AvatarFallback>
                                                        {project.name[0]?.toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="font-medium">{project.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {project.sandboxes.length > 0 ? (
                                                <TooltipProvider>
                                                    <div className="flex flex-col gap-1">
                                                        {project.sandboxes.map((sandbox) => {
                                                            const editorUrl = `https://codesandbox.io/s/${sandbox.sandboxId}`;
                                                            const previewUrl = `https://${sandbox.sandboxId}-3000.csb.app`;
                                                            return (
                                                                <div key={sandbox.sandboxId} className="flex items-center gap-2 text-sm">
                                                                    <Badge variant="secondary" className="font-mono text-xs">
                                                                        {sandbox.sandboxId}
                                                                    </Badge>
                                                                    <span className="text-muted-foreground">
                                                                        ({sandbox.branchName})
                                                                    </span>
                                                                    <div className="flex gap-1">
                                                                        <Tooltip>
                                                                            <TooltipTrigger asChild>
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="sm"
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        window.open(editorUrl, '_blank');
                                                                                    }}
                                                                                    className="h-6 px-2"
                                                                                >
                                                                                    <Code2 className="size-3.5" />
                                                                                </Button>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent>
                                                                                <p className="text-xs">{editorUrl}</p>
                                                                            </TooltipContent>
                                                                        </Tooltip>
                                                                        <Tooltip>
                                                                            <TooltipTrigger asChild>
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="sm"
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        window.open(previewUrl, '_blank');
                                                                                    }}
                                                                                    className="h-6 px-2"
                                                                                >
                                                                                    <ExternalLink className="size-3.5" />
                                                                                </Button>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent>
                                                                                <p className="text-xs">{previewUrl}</p>
                                                                            </TooltipContent>
                                                                        </Tooltip>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </TooltipProvider>
                                            ) : (
                                                <span className="text-muted-foreground">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {project.users.length > 0 ? (
                                                <div className="flex flex-col gap-1">
                                                    {project.users.map((user) => (
                                                        <div key={user.id} className="text-sm">
                                                            <span
                                                                className="font-medium hover:text-primary hover:underline cursor-pointer"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    router.push(`/users/${user.id}`);
                                                                }}
                                                            >
                                                                {user.name}
                                                            </span>
                                                            <span className="text-muted-foreground ml-2">
                                                                {user.email}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {new Date(project.createdAt).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric',
                                            })}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">
                                                {new Date(project.updatedAt).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric',
                                                })}
                                            </Badge>
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

'use client';

import { api } from '@/trpc/react';
import { Avatar, AvatarFallback, AvatarImage } from '@onlook/ui/avatar';
import { Badge } from '@onlook/ui/badge';
import { Button } from '@onlook/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@onlook/ui/card';
import { Skeleton } from '@onlook/ui/skeleton';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@onlook/ui/tooltip';
import { Code2, ExternalLink, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AddUserToProject } from './add-user-to-project';

interface ProjectDetailProps {
    projectId: string;
}

export function ProjectDetail({ projectId }: ProjectDetailProps) {
    const router = useRouter();
    const { data: project, isLoading, error } = api.projects.getById.useQuery(projectId);
    const utils = api.useUtils();

    const removeUserMutation = api.projects.removeUser.useMutation({
        onSuccess: () => {
            utils.projects.getById.invalidate(projectId);
        },
    });

    if (error) {
        return (
            <Card className="border-destructive/50">
                <CardHeader>
                    <CardTitle className="text-destructive">Error Loading Project</CardTitle>
                    <CardDescription>{error.message}</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    if (isLoading || !project) {
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
            {/* Project Info */}
            <Card>
                <CardHeader>
                    <div className="flex items-start gap-4">
                        {project.previewImgUrl && (
                            <Avatar className="size-16">
                                <AvatarImage src={project.previewImgUrl} />
                                <AvatarFallback>{project.name?.[0]?.toUpperCase() || 'P'}</AvatarFallback>
                            </Avatar>
                        )}
                        <div className="flex-1">
                            <CardTitle className="text-2xl">{project.name}</CardTitle>
                            <CardDescription className="mt-1">
                                Project ID: {project.id}
                            </CardDescription>
                            <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                                {project.createdAt && (
                                    <span>
                                        Created: {new Date(project.createdAt).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric',
                                        })}
                                    </span>
                                )}
                                {project.updatedAt && (
                                    <span>
                                        Updated: {new Date(project.updatedAt).toLocaleDateString('en-US', {
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
            </Card>

            {/* Sandboxes */}
            <Card>
                <CardHeader>
                    <CardTitle>Sandboxes</CardTitle>
                    <CardDescription>
                        {project.sandboxes.length} sandbox{project.sandboxes.length !== 1 ? 'es' : ''}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {project.sandboxes.length > 0 ? (
                        <TooltipProvider>
                            <div className="space-y-2">
                                {project.sandboxes.map((sandbox) => {
                                    const editorUrl = `https://codesandbox.io/s/${sandbox.sandboxId}`;
                                    const previewUrl = `https://${sandbox.sandboxId}-3000.csb.app`;
                                    return (
                                        <div
                                            key={sandbox.sandboxId}
                                            className="flex items-center justify-between p-3 border rounded-lg"
                                        >
                                            <div className="flex items-center gap-3">
                                                <Badge variant="secondary" className="font-mono text-xs">
                                                    {sandbox.sandboxId}
                                                </Badge>
                                                <span className="text-sm text-muted-foreground">
                                                    {sandbox.branchName}
                                                </span>
                                            </div>
                                            <div className="flex gap-1">
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => window.open(editorUrl, '_blank')}
                                                            className="h-8 px-3"
                                                        >
                                                            <Code2 className="size-4" />
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
                                                            onClick={() => window.open(previewUrl, '_blank')}
                                                            className="h-8 px-3"
                                                        >
                                                            <ExternalLink className="size-4" />
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
                        <p className="text-sm text-muted-foreground">No sandboxes found</p>
                    )}
                </CardContent>
            </Card>

            {/* Users */}
            <Card>
                <CardHeader>
                    <CardTitle>Users with Access</CardTitle>
                    <CardDescription>
                        {project.users.length} user{project.users.length !== 1 ? 's' : ''}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <AddUserToProject projectId={projectId} />

                    {project.users.length > 0 ? (
                        <div className="space-y-2">
                            {project.users.map((user) => (
                                <div
                                    key={user.id}
                                    className="flex items-center justify-between p-3 border rounded-lg"
                                >
                                    <div className="flex items-center gap-3">
                                        <Avatar className="size-10">
                                            <AvatarImage src={user.avatarUrl || undefined} />
                                            <AvatarFallback>
                                                {user.name?.[0]?.toUpperCase() || 'U'}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <button
                                                className="font-medium hover:text-primary hover:underline cursor-pointer text-left"
                                                onClick={() => router.push(`/users/${user.id}`)}
                                            >
                                                {user.name}
                                            </button>
                                            <p className="text-sm text-muted-foreground">{user.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline">{user.role}</Badge>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                if (confirm(`Remove ${user.name} from this project?`)) {
                                                    removeUserMutation.mutate({
                                                        projectId,
                                                        userId: user.id,
                                                    });
                                                }
                                            }}
                                            className="h-8 px-2 text-destructive hover:text-destructive"
                                        >
                                            <Trash2 className="size-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">No users have access to this project</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

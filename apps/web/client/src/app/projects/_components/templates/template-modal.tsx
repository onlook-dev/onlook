"use client";

import { useAuthContext } from '@/app/auth/auth-context';
import { api } from '@/trpc/react';
import { LocalForageKeys, Routes } from '@/utils/constants';
import { SandboxTemplates, Templates, getSandboxPreviewUrl } from '@onlook/constants';
import type { User } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { AnimatePresence, motion } from "motion/react";
import localforage from 'localforage';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { LazyImage } from "./lazy-image";

interface TemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    description: string;
    image: string;
    isNew?: boolean;
    isStarred?: boolean;
    onToggleStar?: () => void;
    projectId?: string;
    onUnmarkTemplate?: () => void;
    user?: User | null;
    templateProject?: any;
}

export function TemplateModal({
    isOpen,
    onClose,
    title,
    description,
    image,
    isNew = false,
    isStarred = false,
    onToggleStar,
    projectId,
    onUnmarkTemplate,
    user,
    templateProject
}: TemplateModalProps) {
    const { mutateAsync: forkSandbox } = api.sandbox.fork.useMutation();
    const { mutateAsync: createProject } = api.project.create.useMutation();
    const { setIsAuthModalOpen } = useAuthContext();
    const router = useRouter();
    const [isCreatingProject, setIsCreatingProject] = useState(false);

    const handleUseTemplate = async () => {
        if (!user?.id) {
            localforage.setItem(LocalForageKeys.RETURN_URL, window.location.pathname);
            setIsAuthModalOpen(true);
            return;
        }

        if (!templateProject) {
            toast.error('Template data not available');
            return;
        }

        setIsCreatingProject(true);
        try {
            let sandboxTemplate;
            const templateName = title.toLowerCase();
            
            if (templateName.includes('saas') || templateName.includes('platform')) {
                sandboxTemplate = SandboxTemplates[Templates.SAAS_PLATFORM];
            } else {
                sandboxTemplate = SandboxTemplates[Templates.EMPTY_NEXTJS];
            }

            const { sandboxId, previewUrl } = await forkSandbox({
                sandbox: sandboxTemplate,
                config: {
                    title: `${title} - ${user.id}`,
                    tags: ['template', title.toLowerCase().replace(/\s+/g, '-'), user.id],
                },
            });

            const newProject = await createProject({
                project: {
                    name: `${title} (Copy)`,
                    sandboxId,
                    sandboxUrl: previewUrl,
                    description: description || `Your new ${title.toLowerCase()} project`,
                    tags: [],
                },
                userId: user.id,
            });

            if (newProject) {
                toast.success(`Created new project from ${title} template!`);
                onClose();
                router.push(`${Routes.PROJECT}/${newProject.id}`);
            }
        } catch (error) {
            console.error('Error creating project from template:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);

            if (errorMessage.includes('502') || errorMessage.includes('sandbox')) {
                toast.error('Sandbox service temporarily unavailable', {
                    description: 'Please try again in a few moments. Our servers may be experiencing high load.',
                });
            } else {
                toast.error('Failed to create project from template', {
                    description: errorMessage,
                });
            }
        } finally {
            setIsCreatingProject(false);
        }
    };

    const handlePreviewTemplate = () => {
        console.log('Preview Template clicked', templateProject);
        if (templateProject?.sandboxId) {
            const sandboxUrl = getSandboxPreviewUrl(templateProject.sandboxId, 3000);
            console.log('Opening URL:', sandboxUrl);
            window.open(sandboxUrl, '_blank');
        } else {
            console.log('No sandbox ID found:', templateProject?.sandboxId);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                >
                    <motion.div
                        className="bg-background border border-border rounded-2xl max-w-4xl w-full max-h-[80vh] flex relative shadow-2xl"
                        initial={{ scale: 0.95 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0.95 }}
                        transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Button
                            onClick={onClose}
                            variant="ghost"
                            size="sm"
                            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-background/20 hover:bg-secondary transition-colors"
                        >
                            <Icons.CrossS className="w-4 h-4" />
                        </Button>

                        <div className="w-1/2 bg-secondary relative rounded-l-2xl overflow-hidden">
                            <LazyImage
                                src={image}
                                alt={`${title} template preview`}
                                className="w-full h-full object-cover"
                            />

                            {isNew && (
                                <div className="absolute top-4 left-4 bg-blue-600 text-white text-xs px-2 py-1 rounded-full font-medium">
                                    New
                                </div>
                            )}
                        </div>

                        <div className="w-1/2 p-8 flex flex-col overflow-visible min-h-80">
                            <h2 className="text-2xl font-semibold text-foreground mb-4">
                                {title}
                            </h2>

                            <p className="text-foreground-secondary text-base leading-relaxed mb-8 flex-1">
                                {description}
                            </p>

                            <div className="flex items-center gap-3 overflow-visible">
                                <Button 
                                    className="flex-1" 
                                    size="lg"
                                    onClick={handleUseTemplate}
                                    disabled={isCreatingProject}
                                >
                                    {isCreatingProject ? (
                                        <div className="flex items-center gap-2">
                                            <Icons.LoadingSpinner className="w-4 h-4 animate-spin" />
                                            Creating...
                                        </div>
                                    ) : (
                                        'Use Template'
                                    )}
                                </Button>

                                {onToggleStar && (
                                    <Button
                                        variant="outline"
                                        size="lg"
                                        onClick={onToggleStar}
                                        aria-label={isStarred ? "Remove from favorites" : "Add to favorites"}
                                    >
{isStarred ? (
                                            <Icons.BookmarkFilled
                                                className="w-5 h-5 text-white"
                                            />
                                        ) : (
                                            <Icons.Bookmark
                                                className="w-5 h-5 text-foreground-tertiary"
                                            />
                                        )}
                                    </Button>
                                )}

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="lg"
                                            aria-label="Template options"
                                        >
                                            <Icons.DotsHorizontal className="w-5 h-5" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48">
                                        <DropdownMenuItem onClick={handlePreviewTemplate}>
                                            <Icons.EyeOpen className="w-4 h-4 mr-3" />
                                            Preview Template
                                        </DropdownMenuItem>
                                        <DropdownMenuItem>
                                            <Icons.Share className="w-4 h-4 mr-3" />
                                            Share Template
                                        </DropdownMenuItem>
                                        <DropdownMenuItem>
                                            <Icons.Download className="w-4 h-4 mr-3" />
                                            Download
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        {onUnmarkTemplate && (
                                            <DropdownMenuItem 
                                                onClick={onUnmarkTemplate}
                                                className="text-foreground-secondary focus:text-foreground"
                                            >
                                                <Icons.BookmarkFilled className="w-4 h-4 mr-3" />
                                                Remove Template
                                            </DropdownMenuItem>
                                        )}
                                        <DropdownMenuItem className="text-red-400 focus:text-red-300">
                                            Report Template
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>

                            <div className="mt-6 pt-6 border-t border-border">
                                <div className="text-sm text-foreground-tertiary">
                                    Used 24 times • Created 24 days ago
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
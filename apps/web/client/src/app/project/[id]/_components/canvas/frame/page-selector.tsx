import { useEditorEngine } from '@/components/store/editor';
import { LeftPanelTabValue, type PageNode, type WebFrame } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { Separator } from '@onlook/ui/separator';
import { cn } from '@onlook/ui/utils';
import { inferPageFromUrl } from '@onlook/utility';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useMemo, useState } from 'react';
import { PageModal } from '../../left-panel/page-tab/page-modal';

interface PageSelectorProps {
    frame: WebFrame;
    className?: string;
}

export const PageSelector = observer(({ frame, className }: PageSelectorProps) => {
    const editorEngine = useEditorEngine();
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Get inferred current page from URL immediately
    const inferredCurrentPage = useMemo(() => inferPageFromUrl(frame.url), [frame.url]);

    // Flatten the page tree to get all pages for finding current page
    const flattenPages = (pages: PageNode[]): PageNode[] => {
        return pages.reduce<PageNode[]>((acc, page) => {
            acc.push(page);
            if (page.children) {
                acc.push(...flattenPages(page.children));
            }
            return acc;
        }, []);
    };

    const allPages = useMemo(() => {
        return flattenPages(editorEngine.pages.tree);
    }, [editorEngine.pages.tree]);

    // Find the current page based on the frame URL
    const currentPage = useMemo(() => {
        const framePathname = new URL(frame.url).pathname;
        return allPages.find(page => {
            const pagePath = page.path === '/' ? '' : page.path;
            return framePathname === pagePath || framePathname === page.path;
        });
    }, [frame.url, allPages]);

    // Render pages recursively with indentation
    const renderPageItems = (pages: PageNode[], depth = 0): React.ReactElement[] => {
        const items: React.ReactElement[] = [];

        for (const page of pages) {
            const isCurrentPage = currentPage?.id === page.id;
            const hasChildren = page.children && page.children.length > 0;

            items.push(
                <DropdownMenuItem
                    key={page.id}
                    onClick={() => handlePageSelect(page)}
                    className={cn(
                        "cursor-pointer",
                        isCurrentPage && "bg-accent"
                    )}
                >
                    <div className="flex items-center w-full" style={{ paddingLeft: `${depth * 16}px` }}>
                        {hasChildren ? (
                            <Icons.Directory className="w-4 h-4 mr-2" />
                        ) : (
                            <Icons.File className="w-4 h-4 mr-2" />
                        )}
                        <span className="truncate">{page.name}</span>
                        {isCurrentPage && (
                            <Icons.Check className="ml-auto h-3 w-3" />
                        )}
                    </div>
                </DropdownMenuItem>
            );

            // Render children recursively
            if (page.children && page.children.length > 0) {
                items.push(...renderPageItems(page.children, depth + 1));
            }
        }

        return items;
    };

    useEffect(() => {
        if (editorEngine.sandbox.routerConfig) {
            editorEngine.pages.scanPages();
        }
    }, [editorEngine.sandbox.routerConfig]);

    const displayPages = useMemo(() => {
        if (allPages.length > 0) {
            return allPages;
        }
        // Temp page while scanning
        return [{
            id: 'temp-current',
            name: inferredCurrentPage.name,
            path: inferredCurrentPage.path,
            children: [],
            isActive: true,
            isRoot: inferredCurrentPage.path === '/',
            metadata: {}
        }] as PageNode[];
    }, [allPages, inferredCurrentPage]);

    const displayCurrentPage = currentPage ?? {
        name: inferredCurrentPage.name,
        path: inferredCurrentPage.path
    };

    const handlePageSelect = async (page: PageNode) => {
        try {
            await editorEngine.frames.navigateToPath(frame.id, page.path);
        } catch (error) {
            console.error('Failed to navigate to page:', error);
        }
    };

    const handleManagePages = () => {
        editorEngine.state.leftPanelTab = LeftPanelTabValue.PAGES
        editorEngine.state.leftPanelLocked = true;
    };

    return (
        <DropdownMenu onOpenChange={(open) => {
            if (open) {
                editorEngine.frames.select([frame]);
            }
        }}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                        "h-auto px-2 py-1 text-xs hover:bg-background-secondary",
                        className
                    )}
                >
                    <span className="max-w-32 truncate">
                        {displayCurrentPage.name}
                    </span>
                    <Icons.ChevronDown className="ml-1 h-3 w-3" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
                {displayPages.length > 0 ? (
                    <>
                        {allPages.length > 0 ? (
                            // Show full scanned tree when available
                            renderPageItems(editorEngine.pages.tree)
                        ) : (
                            // Show inferred current page while scanning
                            <>
                                {displayPages[0] && (
                                    <DropdownMenuItem
                                        onClick={() => {
                                            const firstPage = displayPages[0];
                                            if (firstPage) {
                                                void handlePageSelect(firstPage);
                                            }
                                        }}
                                        className="cursor-pointer bg-accent"
                                    >
                                        <div className="flex items-center w-full">
                                            <Icons.File className="w-4 h-4 mr-2" />
                                            <span className="truncate">{displayPages[0].name}</span>
                                            <Icons.Check className="ml-auto h-3 w-3" />
                                        </div>
                                    </DropdownMenuItem>
                                )}
                                {editorEngine.pages.isScanning && (
                                    <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                                        <Icons.LoadingSpinner className="w-3 h-3 mr-2 animate-spin" />
                                        <span>Scanning pages...</span>
                                    </DropdownMenuItem>
                                )}
                            </>
                        )}
                    </>
                ) : (
                    <DropdownMenuItem disabled>
                        No pages available
                    </DropdownMenuItem>
                )}
                <Separator />
                <DropdownMenuItem className="cursor-pointer " onClick={() => setShowCreateModal(true)}>
                    <Icons.FilePlus />
                    <span>
                        New Page
                    </span>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer" onClick={handleManagePages}>
                    <Icons.Gear />
                    <span>
                        Manage Pages
                    </span>
                </DropdownMenuItem>
            </DropdownMenuContent>
            <PageModal mode="create" open={showCreateModal} onOpenChange={setShowCreateModal} />

        </DropdownMenu>
    );
}); 
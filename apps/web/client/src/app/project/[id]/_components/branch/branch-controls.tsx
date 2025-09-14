import { useEditorEngine } from "@/components/store/editor";
import { BranchTabValue, LeftPanelTabValue, type Branch, type Frame, type PageNode } from "@onlook/models";
import {
    DropdownMenuItem,
    DropdownMenuSeparator,
} from "@onlook/ui/dropdown-menu";
import { Icons } from "@onlook/ui/icons";
import { Separator } from "@onlook/ui/separator";
import { inferPageFromUrl } from "@onlook/utility";
import React, { useMemo, useState } from "react";

interface BranchControlsProps {
    branch: Branch;
    frame: Frame;
    onClose?: () => void;
    onForkBranch?: () => void;
    onCreateBlankSandbox?: () => void;
    onManageBranches?: () => void;
    onShowCreateModal?: (show: boolean) => void;
}

export function BranchControls({
    branch,
    frame,
    onClose,
    onForkBranch,
    onCreateBlankSandbox,
    onManageBranches,
    onShowCreateModal
}: BranchControlsProps) {
    const editorEngine = useEditorEngine();
    const [isForking, setIsForking] = useState(false);
    const [isCreatingBlank, setIsCreatingBlank] = useState(false);

    const handleForkBranch = async () => {
        if (isForking) return;

        try {
            setIsForking(true);
            await editorEngine.branches.forkBranch(branch.id);
            onForkBranch?.();
            onClose?.();
        } catch (error) {
            console.error("Failed to fork branch:", error);
        } finally {
            setIsForking(false);
        }
    };

    const handleCreateBlankSandbox = async () => {
        if (isCreatingBlank) return;

        try {
            setIsCreatingBlank(true);
            await editorEngine.branches.createBlankSandbox();
            onCreateBlankSandbox?.();
            onClose?.();
        } catch (error) {
            console.error("Failed to create blank sandbox:", error);
        } finally {
            setIsCreatingBlank(false);
        }
    };

    const handleManageBranches = () => {
        // Open the branches tab in the left panel
        editorEngine.state.leftPanelTab = LeftPanelTabValue.BRANCHES;
        editorEngine.state.leftPanelLocked = true;
        editorEngine.state.branchTab = BranchTabValue.MANAGE;
        editorEngine.state.manageBranchId = branch.id;
        onManageBranches?.();
        onClose?.();
    };

    // Page-related functionality
    const inferredCurrentPage = useMemo(() => inferPageFromUrl(frame.url), [frame.url]);

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

    const currentPage = useMemo(() => {
        const framePathname = new URL(frame.url).pathname;
        return allPages.find(page => {
            const pagePath = page.path === '/' ? '' : page.path;
            return framePathname === pagePath || framePathname === page.path;
        });
    }, [frame.url, allPages]);

    const displayCurrentPage = currentPage ?? {
        name: inferredCurrentPage.name,
        path: inferredCurrentPage.path
    };

    const handlePageSelect = async (page: PageNode) => {
        try {
            await editorEngine.frames.navigateToPath(frame.id, page.path);
            onClose?.();
        } catch (error) {
            console.error('Failed to navigate to page:', error);
        }
    };

    const handleManagePages = () => {
        editorEngine.state.leftPanelTab = LeftPanelTabValue.PAGES;
        editorEngine.state.leftPanelLocked = true;
        onClose?.();
    };

    const renderPageItems = (pages: PageNode[], depth = 0): React.ReactElement[] => {
        const items: React.ReactElement[] = [];

        for (const page of pages) {
            const isCurrentPage = currentPage?.id === page.id;
            const hasChildren = page.children && page.children.length > 0;

            items.push(
                <DropdownMenuItem
                    key={page.id}
                    onClick={() => handlePageSelect(page)}
                    className={`cursor-pointer ${isCurrentPage ? "bg-accent" : ""}`}
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

            if (page.children && page.children.length > 0) {
                items.push(...renderPageItems(page.children, depth + 1));
            }
        }

        return items;
    };

    return (
        <>
            <div className="p-1">
                <DropdownMenuItem
                    className="flex items-center gap-2 p-2"
                    onSelect={handleForkBranch}
                    disabled={isForking}
                >
                    {isForking ? (
                        <Icons.LoadingSpinner className="h-4 w-4" />
                    ) : (
                        <Icons.Commit className="h-4 w-4" />
                    )}
                    <span>{isForking ? "Forking..." : "Fork into a new Branch"}</span>
                </DropdownMenuItem>

                <DropdownMenuItem
                    className="flex items-center gap-2 p-2"
                    onSelect={handleCreateBlankSandbox}
                    disabled={isCreatingBlank}
                >
                    {isCreatingBlank ? (
                        <Icons.LoadingSpinner className="h-4 w-4" />
                    ) : (
                        <Icons.Plus className="h-4 w-4" />
                    )}
                    <span>{isCreatingBlank ? "Creating..." : "Create blank sandbox"}</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                    className="flex items-center gap-2 p-2"
                    onSelect={handleManageBranches}
                >
                    <Icons.Gear className="h-4 w-4" />
                    <span>Manage Branch</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {/* Page Controls Section */}
                <div className="px-2 py-1">
                    <div className="text-xs font-medium text-muted-foreground mb-1">Current Page</div>
                    <div className="flex items-center gap-2 text-sm">
                        <Icons.File className="w-4 h-4" />
                        <span className="truncate">{displayCurrentPage.name}</span>
                    </div>
                </div>

                <DropdownMenuSeparator />

                {allPages.length > 0 ? (
                    <>
                        {renderPageItems(editorEngine.pages.tree)}
                    </>
                ) : (
                    <DropdownMenuItem disabled>
                        <Icons.LoadingSpinner className="w-3 h-3 mr-2 animate-spin" />
                        <span>Scanning pages...</span>
                    </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />

                <DropdownMenuItem 
                    className="cursor-pointer" 
                    onSelect={() => {
                        onShowCreateModal?.(true);
                        onClose?.();
                    }}
                >
                    <Icons.FilePlus />
                    <span>New Page</span>
                </DropdownMenuItem>

                <DropdownMenuItem className="cursor-pointer" onClick={handleManagePages}>
                    <Icons.Gear />
                    <span>Manage Pages</span>
                </DropdownMenuItem>
            </div>
        </>
    );
}
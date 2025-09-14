import { useEditorEngine } from "@/components/store/editor";
import type { Frame, PageNode } from "@onlook/models";
import { Button } from "@onlook/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@onlook/ui/dropdown-menu";
import { Icons } from "@onlook/ui/icons";
import { cn } from "@onlook/ui/utils";
import { inferPageFromUrl } from "@onlook/utility";
import { observer } from "mobx-react-lite";
import { useMemo, useState } from "react";
import { BranchControls } from "../../../branch/branch-controls";
import { HoverOnlyTooltip } from "../../../editor-bar/hover-tooltip";
import { PageModal } from "../../../left-panel/page-tab/page-modal";

interface BranchDisplayProps {
    frame: Frame;
    tooltipSide?: "top" | "bottom" | "left" | "right";
    buttonSize?: "sm" | "default" | "lg";
    buttonClassName?: string;
}

export const BranchDisplay = observer(({ frame, tooltipSide = "top", buttonSize = "sm", buttonClassName }: BranchDisplayProps) => {
    const editorEngine = useEditorEngine();
    const frameBranch = editorEngine.branches.getBranchById(frame.branchId);
    const [isOpen, setIsOpen] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Get current page name
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

    if (!frameBranch) {
        return null;
    }

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <HoverOnlyTooltip content="Branch & Pages" side={tooltipSide} className="mb-1" hideArrow>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size={buttonSize}
                        className={cn(
                            "h-auto px-2 py-1 text-xs hover:bg-background-secondary",
                            buttonClassName
                        )}
                    >
                        <Icons.Commit />
                        <div className="flex items-center gap-1.5 max-w-24 truncate">
                            <span className="truncate">{frameBranch.name}</span>
                            {displayCurrentPage.name && displayCurrentPage.name !== 'Unknown' && (
                                <>
                                    <span className="opacity-50 flex-shrink-0">/</span>
                                    <span className="truncate">{displayCurrentPage.name}</span>
                                </>
                            )}
                        </div>
                    </Button>
                </DropdownMenuTrigger>
            </HoverOnlyTooltip>
            <DropdownMenuSeparator />
            <DropdownMenuContent align="start" className="w-[320px] p-0">
                <BranchControls 
                    branch={frameBranch} 
                    frame={frame} 
                    onClose={() => setIsOpen(false)}
                    onShowCreateModal={(show) => setShowCreateModal(show)}
                />
            </DropdownMenuContent>
            <PageModal mode="create" open={showCreateModal} onOpenChange={setShowCreateModal} />
        </DropdownMenu >
    );
});
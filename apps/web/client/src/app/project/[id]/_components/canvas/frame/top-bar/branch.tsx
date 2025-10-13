import { useEditorEngine } from "@/components/store/editor";
import type { Frame } from "@onlook/models";
import { Button } from "@onlook/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@onlook/ui/dropdown-menu";
import { Icons } from "@onlook/ui/icons";
import { cn } from "@onlook/ui/utils";
import { observer } from "mobx-react-lite";
import { useState } from "react";
import { BranchControls } from "../../../branch/branch-controls";
import { HoverOnlyTooltip } from "../../../editor-bar/hover-tooltip";

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

    if (!frameBranch) {
        return null;
    }

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <HoverOnlyTooltip content="Branch" side={tooltipSide} className="mb-1" hideArrow>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size={buttonSize}
                        className={cn(
                            "h-auto px-2 py-1 text-xs hover:!bg-transparent focus:!bg-transparent active:!bg-transparent",
                            buttonClassName
                        )}
                    >
                        <Icons.Branch />
                        <div className="flex items-center gap-1.5 max-w-24 truncate">
                            <span className="truncate">{frameBranch.name}</span>
                        </div>
                    </Button>
                </DropdownMenuTrigger>
            </HoverOnlyTooltip>
            <DropdownMenuSeparator />
            <DropdownMenuContent align="start" className="w-[200px] p-0">
                <BranchControls 
                    branch={frameBranch} 
                    onClose={() => setIsOpen(false)}
                />
            </DropdownMenuContent>
        </DropdownMenu >
    );
});
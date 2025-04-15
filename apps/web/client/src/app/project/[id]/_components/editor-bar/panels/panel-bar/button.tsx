"use client";

import * as React from "react";
import { Button } from "@onlook/ui-v4/button";
import type { IconProps } from "@onlook/ui-v4/icons";
import type { ForwardRefExoticComponent, RefAttributes } from "react";
import { cn } from "@onlook/ui/utils";

interface PanelButtonProps {
    icon: ForwardRefExoticComponent<IconProps & RefAttributes<SVGSVGElement>>;
    isActive?: boolean;
    onClick?: () => void;
}

export const PanelButton = ({ icon: Icon, isActive, onClick }: PanelButtonProps) => {
    return (
        <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClick}
            className={cn(
                "flex items-center gap-2 text-muted-foreground border border-border/0 cursor-pointer rounded-lg hover:bg-background-tertiary/20 hover:text-white hover:border hover:border-border px-1 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus-visible:outline-none active:border-0",
                isActive && "bg-background-tertiary/20 text-white border border-border"
            )}
        >
            <Icon className="h-4 w-4" />
        </Button>
    );
};

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
            className={cn(isActive && "bg-accent")}
        >
            <Icon className="h-4 w-4" />
        </Button>
    );
};

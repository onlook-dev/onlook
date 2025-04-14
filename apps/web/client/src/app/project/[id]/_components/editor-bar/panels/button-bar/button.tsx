"use client";

import * as React from "react";
import { Button } from "@onlook/ui-v4/button";
import { Icons } from "@onlook/ui-v4/icons";
import type { IconProps } from "@onlook/ui-v4/icons";
import type { ForwardRefExoticComponent, RefAttributes } from "react";

interface PanelButtonProps {
    icon: ForwardRefExoticComponent<IconProps & RefAttributes<SVGSVGElement>>;
}

export const PanelButton = ({ icon: Icon }: PanelButtonProps) => {
    return (
        <Button variant="ghost" size="icon">
            <Icon className="h-4 w-4" />
        </Button>
    );
};

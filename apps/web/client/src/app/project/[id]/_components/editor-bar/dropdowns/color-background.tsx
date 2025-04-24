"use client";

import { Button } from "@onlook/ui-v4/button";
import { Icons } from "@onlook/ui-v4/icons";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@onlook/ui-v4/dropdown-menu";

export const ColorBackground = () => {
    return (
        <Button
        variant="ghost"
        size="icon"
        className="flex items-center justify-center px-5 flex-col gap-0.5 text-muted-foreground border border-border/0 cursor-pointer rounded-lg hover:bg-background-tertiary/20 hover:text-white hover:border hover:border-border focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus-visible:outline-none active:bg-background-tertiary/20 active:text-white active:border active:border-border"
    >
        <Icons.PaintBucket className="h-4 w-4" />
        <div className="h-[2.5px] w-5.5 bg-current rounded-full" />
    </Button>
    );
};

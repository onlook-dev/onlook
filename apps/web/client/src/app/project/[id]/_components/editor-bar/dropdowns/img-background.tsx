"use client";

import { Button } from "@onlook/ui-v4/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@onlook/ui-v4/dropdown-menu";

export const ImageBackground = () => {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    className="flex items-center gap-2 text-muted-foreground border border-border/0 cursor-pointer rounded-lg hover:bg-background-tertiary/20 hover:text-white hover:border hover:border-border data-[state=open]:bg-background-tertiary/20 data-[state=open]:text-white data-[state=open]:border data-[state=open]:border-border px-3 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus-visible:outline-none active:border-0"
                >
                    <div className="h-5 w-5 rounded-sm relative">
                        <div 
                            className="absolute inset-0 rounded-sm"
                            style={{
                                backgroundImage: `
                                    linear-gradient(45deg, #777777 25%, transparent 25%),
                                    linear-gradient(-45deg, #777777 25%, transparent 25%),
                                    linear-gradient(45deg, transparent 75%, #777777 75%),
                                    linear-gradient(-45deg, transparent 75%, #777777 75%)
                                `,
                                backgroundSize: '6px 6px',
                                backgroundPosition: '0 0, 0 3px, 3px -3px, -3px 0px',
                                backgroundColor: '#888888'
                            }}
                        />
                    </div>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[240px] mt-2 p-3 rounded-lg">
                {/* Dropdown content will go here */}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

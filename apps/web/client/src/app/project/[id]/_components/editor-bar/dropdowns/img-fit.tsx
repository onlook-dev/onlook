"use client";

import { Button } from "@onlook/ui-v4/button";
import { Icons } from "@onlook/ui-v4/icons";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@onlook/ui-v4/dropdown-menu";
import { useState } from "react";

export const ImgFit = () => {
    const [objectFit, setObjectFit] = useState('cover');
    
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    className="flex items-center gap-2 text-muted-foreground border border-border/0 cursor-pointer rounded-lg hover:bg-background-tertiary/20 hover:text-white hover:border hover:border-border data-[state=open]:bg-background-tertiary/20 data-[state=open]:text-white data-[state=open]:border data-[state=open]:border-border px-3 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus-visible:outline-none active:border-0"
                >
                    <Icons.Image className="h-4 w-4 min-h-4 min-w-4" />
                    <span className="text-sm">{objectFit === 'cover' ? 'Cover' : objectFit === 'contain' ? 'Contain' : 'Fill'}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[120px] mt-2 p-1 rounded-lg">
                <div className="p-2 space-y-2">
                    <div className="space-y-1">
                        <span className="text-sm text-muted-foreground">Type</span>
                        <div className="flex gap-1">
                            <button 
                                onClick={() => setObjectFit('cover')}
                                className={`flex-1 text-sm px-3 py-1 rounded-md ${
                                    objectFit === 'cover' 
                                        ? 'bg-background-tertiary/20 text-white' 
                                        : 'text-muted-foreground hover:bg-background-tertiary/10'
                                }`}
                            >
                                Cover
                            </button>
                            <button 
                                onClick={() => setObjectFit('contain')}
                                className={`flex-1 text-sm px-3 py-1 rounded-md ${
                                    objectFit === 'contain' 
                                        ? 'bg-background-tertiary/20 text-white' 
                                        : 'text-muted-foreground hover:bg-background-tertiary/10'
                                }`}
                            >
                                Contain
                            </button>
                            <button 
                                onClick={() => setObjectFit('fill')}
                                className={`flex-1 text-sm px-3 py-1 rounded-md ${
                                    objectFit === 'fill' 
                                        ? 'bg-background-tertiary/20 text-white' 
                                        : 'text-muted-foreground hover:bg-background-tertiary/10'
                                }`}
                            >
                                Fill
                            </button>
                        </div>
                    </div>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

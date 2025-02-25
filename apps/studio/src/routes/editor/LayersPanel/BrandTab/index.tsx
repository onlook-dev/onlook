import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import BrandPallet from './BrandPallet';

const BrandTab = observer(() => {
    const [isPalletOpen, setIsPalletOpen] = useState(false);

    return (
        <div className="flex flex-col h-[calc(100vh-8.25rem)] text-xs text-active flex-grow w-full p-0">
            {!isPalletOpen ? (
                <>
                    {/* Site Colors Section */}
                    <div className="flex flex-col gap-2 px-4 py-[18px] border-b border-border">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-normal">Brand Pallet</span>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs text-muted-foreground hover:text-foreground p-0 h-auto min-h-0 hover:bg-transparent"
                                onClick={() => setIsPalletOpen(true)}
                            >
                                View all
                            </Button>
                        </div>
                        <div className="grid grid-cols-4 gap-1">
                            {/* First Row */}
                            <div className="w-full aspect-square rounded-lg bg-[#00D1FF] cursor-pointer hover:ring-2 hover:ring-border-primary" />
                            <div className="w-full aspect-square rounded-lg bg-[#4ADE80] cursor-pointer hover:ring-2 hover:ring-border-primary" />
                            <div className="w-full aspect-square rounded-lg bg-[#71717A] cursor-pointer hover:ring-2 hover:ring-border-primary" />
                            <div className="w-full aspect-square rounded-lg bg-white cursor-pointer hover:ring-2 hover:ring-border-primary" />

                            {/* Second Row */}
                            <div className="w-full aspect-square rounded-lg bg-[#FFD600] cursor-pointer hover:ring-2 hover:ring-border-primary" />
                            <div className="w-full aspect-square rounded-lg bg-[#FF6B6B] cursor-pointer hover:ring-2 hover:ring-border-primary" />
                            <div className="w-full aspect-square rounded-lg bg-[#818CF8] cursor-pointer hover:ring-2 hover:ring-border-primary" />
                            <Button
                                variant="outline"
                                size="icon"
                                className="w-full h-full rounded-lg border border-dashed flex items-center justify-center bg-transparent hover:bg-transparent"
                            >
                                <Icons.Plus className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Text Styles Section - Hidden */}
                    {/* <div className="flex flex-col gap-2 px-4 py-[18px] border-b border-border">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Text styles</span>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs text-muted-foreground hover:text-foreground p-0 h-auto min-h-0 hover:bg-transparent"
                            >
                                View all
                            </Button>
                        </div>
                        <div className="flex flex-col gap-1">
                            <Button
                                variant="outline"
                                className="h-12 justify-between text-left px-3 bg-transparent hover:bg-transparent"
                            >
                                <span className="text-base font-semibold">Heading Large</span>
                                <div className="flex items-center gap-0.5 text-[11px] font-normal text-muted-foreground">
                                    <span>48</span>
                                    <span>/</span>
                                    <span>1.2</span>
                                </div>
                            </Button>
                            <Button
                                variant="outline"
                                className="h-12 justify-between text-left px-3 bg-transparent hover:bg-transparent"
                            >
                                <span className="text-base font-medium">Heading Medium</span>
                                <div className="flex items-center gap-0.5 text-[11px] font-normal text-muted-foreground">
                                    <span>36</span>
                                    <span>/</span>
                                    <span>1.2</span>
                                </div>
                            </Button>
                            <Button
                                variant="outline"
                                className="h-12 justify-between text-left px-3 bg-transparent hover:bg-transparent"
                            >
                                <span className="text-base font-light">Body Regular</span>
                                <div className="flex items-center gap-0.5 text-[11px] font-normal text-muted-foreground">
                                    <span>16</span>
                                    <span>/</span>
                                    <span>1.4</span>
                                </div>
                            </Button>
                            <Button
                                variant="ghost"
                                className="h-12 flex items-center justify-center text-center px-4 bg-[#1C1C1C] hover:bg-[#1C1C1C] border-0 mt-1"
                            >
                                <span className="text-sm text-muted-foreground">
                                    Add a custom text style
                                </span>
                            </Button>
                        </div>
                    </div> */}

                    {/* Site Fonts Section - Hidden */}
                    {/* <div className="flex flex-col gap-2 px-4 py-[18px] border-b border-border">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-normal">Brand fonts</span>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs text-muted-foreground hover:text-foreground p-0 h-auto min-h-0 hover:bg-transparent"
                            >
                                View all
                            </Button>
                        </div>
                        <div className="flex flex-col gap-1">
                            <Button
                                variant="ghost"
                                className="justify-between h-8 px-2 hover:bg-background-secondary"
                            >
                                <span className="font-poppins">Poppins</span>
                                <Icons.ChevronDown className="h-4 w-4 text-muted-foreground" />
                            </Button>
                            <Button
                                variant="ghost"
                                className="justify-between h-8 px-2 hover:bg-background-secondary"
                            >
                                <span className="font-switzer">Switzer</span>
                                <Icons.ChevronDown className="h-4 w-4 text-muted-foreground" />
                            </Button>
                            <Button
                                variant="ghost"
                                className="h-12 flex items-center justify-center text-center px-4 bg-[#1C1C1C] hover:bg-[#1C1C1C] border-0 mt-1"
                            >
                                <span className="text-sm text-muted-foreground">
                                    Add a new font
                                </span>
                            </Button>
                        </div>
                    </div> */}
                </>
            ) : (
                <div className="fixed inset-0 z-50 flex items-start justify-end">
                    <div
                        className="fixed inset-0 bg-background/80 backdrop-blur-sm"
                        onClick={() => setIsPalletOpen(false)}
                    />
                    <div className="relative h-full w-[280px]">
                        <BrandPallet onClose={() => setIsPalletOpen(false)} />
                    </div>
                </div>
            )}
        </div>
    );
});

export default BrandTab;

import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';

import { BrandTabValue } from '@onlook/models';
import { Button } from '@onlook/ui/button';

import { useEditorEngine } from '@/components/store/editor';
import ColorPanel from './color-panel';
import FontPanel from './font-panel';
import SystemFont from './font-panel/system-font';

interface ColorSquareProps {
    color: string;
}

const ColorSquare = ({ color }: ColorSquareProps) => (
    <div className="aspect-square w-full cursor-pointer" style={{ backgroundColor: color }} />
);

export const BrandTab = observer(() => {
    const editorEngine = useEditorEngine();
    const [brandColors, setBrandColors] = useState<string[]>([]);

    useEffect(() => {
        if (editorEngine.font.fontConfigPath) {
            editorEngine.font.scanFonts();
        }
        // Pre-load theme configuration to avoid delay when opening color panel
        editorEngine.theme.scanConfig();
    }, [editorEngine.font.fontConfigPath, editorEngine.theme]);

    // Get project brand colors
    useEffect(() => {
        const loadBrandColors = async () => {
            await editorEngine.theme.scanConfig();
            const { colorGroups, colorDefaults } = editorEngine.theme;

            // Extract color-500 variants from project colors
            const projectColors: string[] = [];

            // Add colors from custom color groups (user-defined in Tailwind config)
            Object.values(colorGroups).forEach((group) => {
                group.forEach((color) => {
                    // Get the default/500 color from each custom color group
                    if (
                        color.name === '500' ||
                        color.name === 'default' ||
                        color.name === 'DEFAULT'
                    ) {
                        projectColors.push(color.lightColor);
                    }
                });
            });

            // Add colors from default color groups (standard Tailwind colors)
            Object.values(colorDefaults).forEach((group) => {
                group.forEach((color) => {
                    // Get the default/500 color from each default color group
                    if (
                        color.name === '500' ||
                        color.name === 'default' ||
                        color.name === 'DEFAULT'
                    ) {
                        projectColors.push(color.lightColor);
                    }
                });
            });

            setBrandColors(projectColors);
        };

        loadBrandColors();
    }, [editorEngine.theme]);

    // Watch for file changes to automatically detect new color groups
    useEffect(() => {
        const handleFileChange = async (filePath: string) => {
            // Check if the changed file is the Tailwind config
            if (filePath.includes('tailwind.config') || filePath.includes('globals.css')) {
                // Rescan for new color groups
                setTimeout(async () => {
                    try {
                        await editorEngine.theme.scanConfig();

                        const { colorGroups, colorDefaults } = editorEngine.theme;

                        // Extract color-500 variants from project colors
                        const projectColors: string[] = [];

                        // Add colors from custom color groups (user-defined in Tailwind config)
                        Object.values(colorGroups).forEach((group) => {
                            group.forEach((color) => {
                                // Get the default/500 color from each custom color group
                                if (
                                    color.name === '500' ||
                                    color.name === 'default' ||
                                    color.name === 'DEFAULT'
                                ) {
                                    projectColors.push(color.lightColor);
                                }
                            });
                        });

                        // Add colors from default color groups (standard Tailwind colors)
                        Object.values(colorDefaults).forEach((group) => {
                            group.forEach((color) => {
                                // Get the default/500 color from each default color group
                                if (
                                    color.name === '500' ||
                                    color.name === 'default' ||
                                    color.name === 'DEFAULT'
                                ) {
                                    projectColors.push(color.lightColor);
                                }
                            });
                        });

                        setBrandColors(projectColors);
                    } catch (error) {
                        console.warn('Theme scanning failed:', error);
                    }
                }, 100); // Small delay to ensure file is fully written
            }
        };

        // Listen for file changes in the sandbox
        const unsubscribe = editorEngine.activeSandbox.fileEventBus.subscribe('*', (event) => {
            // Check if any of the changed files are Tailwind config files
            const isTailwindConfigChange = event.paths.some(
                (path) => path.includes('tailwind.config') || path.includes('globals.css'),
            );

            if (isTailwindConfigChange && event.paths[0]) {
                handleFileChange(event.paths[0]);
            }
        });

        return () => {
            unsubscribe();
        };
    }, [editorEngine.theme, editorEngine.activeSandbox]);

    // If color panel is visible, show it instead of the main content
    if (editorEngine.state.brandTab === BrandTabValue.COLORS) {
        return <ColorPanel />;
    }

    // If font panel is visible, show it instead of the main content
    if (editorEngine.state.brandTab === BrandTabValue.FONTS) {
        return <FontPanel />;
    }

    return (
        <div className="text-active flex h-full w-full flex-grow flex-col p-0 text-xs">
            {/* Brand Palette Section */}
            <div className="border-border flex flex-col gap-3 border-b px-4 pt-4 pb-6">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <span className="text-sm">Brand Colors</span>
                    </div>

                    <div
                        className="bg-background-onlook grid h-[40px] max-h-[40px] cursor-pointer grid-cols-12 gap-0 overflow-hidden rounded-lg border-[0.5px] border-white/50 transition-all duration-200 hover:border-[0.5px] hover:border-transparent hover:border-white"
                        onClick={() => (editorEngine.state.brandTab = BrandTabValue.COLORS)}
                    >
                        {brandColors.length > 0
                            ? brandColors.map((color, index) => (
                                  <ColorSquare key={`brand-color-${index}`} color={color} />
                              ))
                            : Array.from({ length: 12 }, (_, index) => (
                                  <div
                                      key={`loading-color-${index}`}
                                      className="animate-shimmer h-full w-full bg-gradient-to-r from-gray-300 via-gray-400 to-gray-300 bg-[length:200%_100%]"
                                  />
                              ))}
                    </div>
                </div>

                <Button
                    variant="ghost"
                    className="text-muted-foreground hover:text-foreground bg-background-secondary hover:bg-background-secondary/70 h-10 w-full rounded-lg border border-white/5 text-sm"
                    onClick={() => (editorEngine.state.brandTab = BrandTabValue.COLORS)}
                >
                    Manage brand colors
                </Button>
            </div>

            {/* Site Fonts Section */}
            <div className="flex flex-col gap-1.5 px-4 pt-5 pb-6">
                <div className="flex flex-col">
                    <div className="flex items-center justify-between">
                        <span className="text-sm">Site Fonts</span>
                    </div>
                    <SystemFont />
                </div>
                <Button
                    variant="ghost"
                    className="text-muted-foreground hover:text-foreground bg-background-secondary hover:bg-background-secondary/70 h-10 w-full rounded-lg border border-white/5 text-sm"
                    onClick={() => (editorEngine.state.brandTab = BrandTabValue.FONTS)}
                >
                    Manage site fonts
                </Button>
            </div>
        </div>
    );
});

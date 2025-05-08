import { useEditorEngine } from '@/components/store/editor';
import { BrandTabValue } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import ColorPanel from './color-panel';
import FontPanel from './font-panel';
import SystemFont from './font-panel/system-font';

interface ColorSquareProps {
    color: string;
}

const ColorSquare = ({ color }: ColorSquareProps) => (
    <div
        className="w-full aspect-square rounded-lg cursor-pointer hover:ring-2 hover:ring-border-primary border border-white/10"
        style={{ backgroundColor: color }}
    />
);

export const BrandTab = observer(() => {
    const editorEngine = useEditorEngine();

    useEffect(() => {
        editorEngine.font.scanFonts();
    }, []);

    // Sample colors for the brand palette
    const brandColors = [
        // Primary colors
        '#ff5a6a', // Coral Red
        '#ff7a8a', // Salmon Pink
        '#ff9aa8', // Light Coral
        '#ffb9c3', // Light Pink
        '#ffd8de', // Pale Pink
        '#fff0f2', // Very Light Pink

        // Secondary colors
        '#ff5a6a', // Coral Red
        '#ff7a8a', // Salmon Pink
        '#ff9aa8', // Light Coral
        '#ffb9c3', // Light Pink
        '#ffd8de', // Pale Pink
    ];

    // If color panel is visible, show it instead of the main content
    if (editorEngine.state.brandTab === BrandTabValue.COLORS) {
        return <ColorPanel />;
    }

    // If font panel is visible, show it instead of the main content
    if (editorEngine.state.brandTab === BrandTabValue.FONTS) {
        return <FontPanel />;
    }

    return (
        <div className="flex flex-col h-full text-xs text-active flex-grow w-full p-0">
            {/* Brand Palette Section */}
            <div className="flex flex-col gap-3 px-4 pt-4 pb-6 border-b border-border">
                <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                        <span className="text-sm">Brand Colors</span>
                    </div>

                    <div className="grid grid-cols-6 gap-1">
                        {brandColors.map((color, index) => (
                            <ColorSquare key={`brand-color-${index}`} color={color} />
                        ))}
                    </div>
                </div>

                <Button
                    variant="ghost"
                    className="w-full h-10 text-sm text-muted-foreground hover:text-foreground bg-background-secondary hover:bg-background-secondary/70 rounded-lg border border-white/5"
                    onClick={() => (editorEngine.state.brandTab = BrandTabValue.COLORS)}
                >
                    Manage brand colors
                </Button>
            </div>

            {/* Site Fonts Section */}
            <div className="flex flex-col gap-1.5 px-4 pt-5 pb-6">
                <div className="flex flex-col">
                    <div className="flex justify-between items-center">
                        <span className="text-sm">Site Fonts</span>
                    </div>
                    <SystemFont />
                </div>
                <Button
                    variant="ghost"
                    className="w-full h-10 text-sm text-muted-foreground hover:text-foreground bg-background-secondary hover:bg-background-secondary/70 rounded-lg border border-white/5"
                    onClick={() => (editorEngine.state.brandTab = BrandTabValue.FONTS)}
                >
                    Manage site fonts
                </Button>
            </div>
        </div>
    );
});

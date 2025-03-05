import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@onlook/ui/collapsible';
import ColorPanel from './ColorPanel';

interface ColorSquareProps {
    color: string;
}

const ColorSquare = ({ color }: ColorSquareProps) => (
    <div
        className="w-full aspect-square rounded-lg cursor-pointer hover:ring-2 hover:ring-border-primary border border-white/10"
        style={{ backgroundColor: color }}
    />
);

interface FontVariantProps {
    name: string;
    isActive?: boolean;
}

const FontVariant = ({ name, isActive = false }: FontVariantProps) => (
    <div className="py-1 text-sm text-muted-foreground">{name}</div>
);

interface FontFamilyProps {
    name: string;
    variants: string[];
    isExpanded?: boolean;
}

const FontFamily = ({ name, variants, isExpanded = false }: FontFamilyProps) => (
    <Collapsible defaultOpen={isExpanded} className="w-full">
        <CollapsibleTrigger className="flex items-center w-full py-1.5">
            <Icons.ChevronRight
                className={`h-4 w-4 mr-1 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            />
            <span className="text-sm font-medium">{name}</span>
        </CollapsibleTrigger>
        <CollapsibleContent className="pl-5">
            {variants.map((variant, index) => (
                <FontVariant
                    key={`${name}-${variant}`}
                    name={variant}
                    isActive={index === variants.length - 2 || index === variants.length - 1}
                />
            ))}
        </CollapsibleContent>
    </Collapsible>
);

const BrandTab = observer(() => {
    const [showColorPanel, setShowColorPanel] = useState(false);

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

    // Toggle color panel visibility
    const handleToggleColorPanel = () => {
        setShowColorPanel(!showColorPanel);
    };

    // If color panel is visible, show it instead of the main content
    if (showColorPanel) {
        return <ColorPanel onClose={handleToggleColorPanel} />;
    }

    return (
        <div className="flex flex-col h-[calc(100vh-8.25rem)] text-xs text-active flex-grow w-full p-0">
            {/* Brand Palette Section */}
            <div className="flex flex-col gap-3 px-4 pt-4 pb-6 border-b border-border">
                <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                        <span className="text-base font-normal">Brand Palette</span>
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
                    onClick={handleToggleColorPanel}
                >
                    Manage brand palette
                </Button>
            </div>

            {/* Site Fonts Section */}
            <div className="flex flex-col gap-3 px-4 pt-5 pb-6">
                <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                        <span className="text-base font-normal">Site fonts</span>
                    </div>

                    <div className="flex flex-col gap-1">
                        <FontFamily
                            name="Poppins"
                            variants={['Light', 'Regular', 'Medium', 'SemiBold', 'Bold']}
                            isExpanded={true}
                        />
                        <FontFamily
                            name="Switzer"
                            variants={['Light', 'Regular', 'Medium', 'SemiBold', 'Bold']}
                            isExpanded={false}
                        />
                    </div>
                </div>
                <Button
                    variant="ghost"
                    className="w-full h-10 text-sm text-muted-foreground hover:text-foreground bg-background-secondary hover:bg-background-secondary/70 rounded-lg border border-white/5"
                >
                    Manage site fonts
                </Button>
            </div>
        </div>
    );
});

export default BrandTab;

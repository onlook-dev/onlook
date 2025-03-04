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
    <div
        className={`py-1 text-sm ${isActive ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}
    >
        {name}
    </div>
);

interface FontFamilyProps {
    name: string;
    variants: string[];
    isExpanded?: boolean;
}

const FontFamily = ({ name, variants, isExpanded = false }: FontFamilyProps) => (
    <Collapsible defaultOpen={isExpanded} className="w-full">
        <CollapsibleTrigger className="flex items-center w-full py-1">
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
        '#2D3250', // Deep Navy
        '#424769', // Slate Blue
        '#7077A1', // Periwinkle
        '#F6B17A', // Peach

        // Secondary colors
        '#7C3E66', // Plum
        '#A5678E', // Mauve
        '#EBC7E6', // Lavender
        '#CBA0AE', // Dusty Rose

        // Neutrals
        '#F2F2F2', // Off White
        '#E0E0E0', // Light Gray
        '#7D7C7C', // Medium Gray
        '#2C2C2C', // Dark Gray
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
            <div className="flex flex-col gap-3 px-4 py-[18px] border-b border-border">
                <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                        <span className="text-base font-medium">Brand Palette</span>
                    </div>

                    <div className="grid grid-cols-6 gap-1">
                        {brandColors.map((color, index) => (
                            <ColorSquare key={`brand-color-${index}`} color={color} />
                        ))}
                    </div>
                </div>

                <Button
                    variant="ghost"
                    className="w-full h-10 text-sm bg-background-secondary hover:bg-background-secondary/70 rounded-lg border border-white/5"
                    onClick={handleToggleColorPanel}
                >
                    Manage brand palette
                </Button>
            </div>

            {/* Site Fonts Section */}
            <div className="flex flex-col gap-3 px-4 py-[18px] border-b border-border">
                <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                        <span className="text-base font-medium">Site fonts</span>
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
                    className="w-full h-10 text-sm bg-background-secondary hover:bg-background-secondary/70 rounded-lg border border-white/5"
                >
                    Manage site fonts
                </Button>
            </div>
        </div>
    );
});

export default BrandTab;

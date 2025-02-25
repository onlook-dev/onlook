import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';

interface ColorSquareProps {
    color: string;
    isSelected?: boolean;
    onClick?: () => void;
    className?: string;
}

const ColorSquare = ({ color, isSelected, onClick, className }: ColorSquareProps) => (
    <button
        className={cn(
            'w-full aspect-square rounded-lg cursor-pointer transition-all border border-white/10',
            isSelected && 'ring-2 ring-border-primary',
            'hover:ring-2 hover:ring-border-primary',
            className,
        )}
        style={{ backgroundColor: color }}
        onClick={onClick}
    />
);

interface BrandPalletProps {
    onClose?: () => void;
}

const BrandPallet = ({ onClose }: BrandPalletProps) => {
    // Your selected colors
    const selectedColors = [
        '#00D1FF', // Light Blue
        '#4ADE80', // Green
        '#71717A', // Gray
        '#FFFFFF', // White
        '#FFD600', // Yellow
        '#FF6B6B', // Coral
        '#818CF8', // Purple
        '#FF00FF', // Magenta
        '#FFA500', // Orange
        '#1C1C1C', // Soft Black
    ];

    // Default color palette
    const defaultColors = [
        '#FF0000',
        '#FF4500',
        '#FFB800',
        '#FFD700',
        '#00FF00',
        '#00CED1',
        '#00BFFF',
        '#0000FF',
        '#8A2BE2',
        '#9400D3',
        '#FF1493',
        '#FF69B4',
        '#FF6B6B',
        '#71717A',
        '#808080',
        '#A9A9A9',
        '#696969',
        '#808080',
    ];

    return (
        <div className="flex flex-col gap-0 p-0 w-full min-w-full flex-grow bg-background text-foreground">
            {/* Header and Colors Sections */}
            <div>
                {/* Header Section */}
                <div className="flex flex-col gap-2 px-4 py-[18px] border-b border-border">
                    <div className="flex justify-between items-center">
                        <h2 className="text-sm font-normal">Brand Pallet</h2>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4 p-0 hover:bg-transparent"
                            onClick={onClose}
                        >
                            <Icons.CrossS className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Selected Colors Grid */}
                    <div className="grid grid-cols-4 gap-1">
                        {selectedColors.map((color, index) => (
                            <div
                                key={`selected-${index}`}
                                className="w-full aspect-square rounded-lg cursor-pointer hover:ring-2 hover:ring-border-primary border border-white/10"
                                style={{ backgroundColor: color }}
                            />
                        ))}
                        <Button
                            variant="outline"
                            className="w-full h-full rounded-lg border border-dashed flex items-center justify-center bg-transparent hover:bg-transparent"
                        >
                            <Icons.Plus className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Default Colors Section */}
                <div className="flex flex-col gap-2 px-4 py-[18px]">
                    <div className="flex flex-col gap-0.5">
                        <span className="text-sm text-foreground">Default colors</span>
                        <span className="text-xs font-normal text-muted-foreground">
                            Add a default color to your brand pallet
                        </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                        {defaultColors.map((color, index) => (
                            <ColorSquare key={`default-${index}`} color={color} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BrandPallet;

"use client";

interface InputColorProps {
    color: string;
    opacity: number;
    onColorChange?: (color: string) => void;
    onOpacityChange?: (opacity: number) => void;
}

export const InputColor = ({
    color,
    opacity,
    onColorChange,
    onOpacityChange
}: InputColorProps) => {
    return (
        <div className="flex items-center w-full h-9">
            <div className="flex-1 flex mr-[1px] items-center bg-background-tertiary/50 rounded-md px-3 pl-1.5 py-1.5 h-full">
                <div 
                    className="w-5 h-5 aspect-square rounded-sm mr-2"
                    style={{ backgroundColor: color }}
                />
                <input 
                    type="text" 
                    value={color}
                    onChange={(e) => onColorChange?.(e.target.value)}
                    className="w-full h-full bg-transparent text-sm text-white focus:outline-none"
                />
            </div>
            <div className="min-w-[60px] max-w-[60px] flex items-center justify-start bg-background-tertiary/50 rounded-md px-2.5 py-1.5 h-full">
                <input 
                    type="text" 
                    value={opacity}
                    onChange={(e) => {
                        const value = parseInt(e.target.value);
                        if (!isNaN(value)) {
                            onOpacityChange?.(value);
                        }
                    }}
                    className="w-full h-full bg-transparent text-sm text-white focus:outline-none text-left"
                />
                <span className="text-sm text-muted-foreground ml-[2px]">%</span>
            </div>
        </div>
    );
};

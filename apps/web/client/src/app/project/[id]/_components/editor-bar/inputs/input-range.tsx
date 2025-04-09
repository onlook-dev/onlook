import { Icons } from "@onlook/ui-v4/icons";

interface InputRangeProps {
    value: number;
    icon?: keyof typeof Icons;
    onChange?: (value: number) => void;
}

export const InputRange = ({ value, icon, onChange }: InputRangeProps) => {
    const Icon = icon ? Icons[icon] : Icons.Padding;

    return (
        <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 min-h-4 min-w-4 text-muted-foreground" />
            <div className="flex-1 flex items-center gap-2">
                <input
                    type="range"
                    min="0"
                    max="500"
                    value={value}
                    onChange={(e) => onChange?.(Number(e.target.value))}
                    className="flex-1 h-1 bg-background-tertiary/50 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                />
                <div className="flex items-center bg-background-tertiary/50 rounded-md px-3 py-1.5 min-w-[80px]">
                    <input 
                        type="text" 
                        value={value}
                        onChange={(e) => onChange?.(Number(e.target.value))}
                        className="w-full bg-transparent text-sm text-white focus:outline-none"
                    />
                </div>
            </div>
        </div>
    );
};

interface ColorRowProps {
    label: string;
    colors: string[];
}

export const ColorRow = ({ label, colors }: ColorRowProps) => (
    <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <div className="grid grid-cols-6 gap-1">
            {colors.map((color, index) => (
                <div
                    key={`${label}-${index}`}
                    className="w-full aspect-square rounded-lg cursor-pointer hover:ring-2 hover:ring-border-primary border border-white/10"
                    style={{ backgroundColor: color }}
                />
            ))}
        </div>
    </div>
);

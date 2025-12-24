import { Icons } from '@onlook/ui/icons';

interface ColorSwatchGroupProps {
    label: string;
    colorClasses: string[];
}

export function ColorSwatchGroup({ label, colorClasses }: ColorSwatchGroupProps) {
    return (
        <div className="mb-1">
            <div className="text-foreground-tertiary text-xs mb-1">{label}</div>
            <div className="grid grid-cols-6 gap-0.5 mb-1 cursor-pointer">
                {colorClasses.slice(0, 6).map((cls, i) => (
                    <div key={cls + i} className={`w-8 h-8 rounded-md border-[1px] border-foreground-primary/20 hover:border-foreground-primary/50 ${cls}`} />
                ))}
            </div>
            <div className="grid grid-cols-6 gap-0.5 cursor-pointer">
                {colorClasses.slice(6, 11).map((cls, i) => (
                    <div key={cls + i} className={`w-8 h-8 rounded-md border-[1px] border-foreground-primary/20 hover:border-foreground-primary/50 ${cls}`} />
                ))}
                {/* 12th swatch: plus icon */}
                <div className="w-8 h-8 rounded-md bg-black border border-foreground-tertiary/50 border-dashed flex items-center group justify-center cursor-pointer hover:bg-foreground-tertiary/20 hover:border-foreground-tertiary/80">
                    <Icons.Plus className="text-foreground-tertiary text-xl leading-none select-none group-hover:text-foreground-primary" />
                </div>
            </div>
        </div>
    );
} 
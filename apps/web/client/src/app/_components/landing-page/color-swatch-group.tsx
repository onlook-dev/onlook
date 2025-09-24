import { Icons } from '@onlook/ui/icons';

interface ColorSwatchGroupProps {
    label: string;
    colorClasses: string[];
}

export function ColorSwatchGroup({ label, colorClasses }: ColorSwatchGroupProps) {
    return (
        <div className="mb-1">
            <div className="text-foreground-tertiary mb-1 text-xs">{label}</div>
            <div className="mb-1 grid cursor-pointer grid-cols-6 gap-0.5">
                {colorClasses.slice(0, 6).map((cls, i) => (
                    <div
                        key={cls + i}
                        className={`border-foreground-primary/20 hover:border-foreground-primary/50 h-8 w-8 rounded-md border-[1px] ${cls}`}
                    />
                ))}
            </div>
            <div className="grid cursor-pointer grid-cols-6 gap-0.5">
                {colorClasses.slice(6, 11).map((cls, i) => (
                    <div
                        key={cls + i}
                        className={`border-foreground-primary/20 hover:border-foreground-primary/50 h-8 w-8 rounded-md border-[1px] ${cls}`}
                    />
                ))}
                {/* 12th swatch: plus icon */}
                <div className="border-foreground-tertiary/50 group hover:bg-foreground-tertiary/20 hover:border-foreground-tertiary/80 flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-dashed bg-black">
                    <Icons.Plus className="text-foreground-tertiary group-hover:text-foreground-primary text-xl leading-none select-none" />
                </div>
            </div>
        </div>
    );
}

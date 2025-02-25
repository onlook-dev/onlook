import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { observer } from 'mobx-react-lite';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';

interface ColorRowProps {
    label: string;
    colors: string[];
}

const ColorRow = ({ label, colors }: ColorRowProps) => (
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

interface BrandPalletGroupProps {
    onRename: () => void;
    onDelete: () => void;
}

const BrandPalletGroup = ({ onRename, onDelete }: BrandPalletGroupProps) => (
    <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center">
            <span className="text-sm font-normal">Group name</span>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 p-0 hover:bg-transparent"
                    >
                        <Icons.DotsHorizontal className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    className="rounded-md bg-background"
                    align="start"
                    side="bottom"
                >
                    <DropdownMenuItem asChild>
                        <Button
                            variant="ghost"
                            className="hover:bg-background-secondary focus:bg-background-secondary w-full rounded-sm group"
                            onClick={onRename}
                        >
                            <span className="flex w-full text-smallPlus items-center">
                                <Icons.Pencil className="mr-2 h-4 w-4 text-foreground-secondary group-hover:text-foreground-active" />
                                <span>Rename</span>
                            </span>
                        </Button>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Button
                            variant="ghost"
                            className="hover:bg-background-secondary focus:bg-background-secondary w-full rounded-sm group"
                            onClick={onDelete}
                        >
                            <span className="flex w-full text-smallPlus items-center">
                                <Icons.Trash className="mr-2 h-4 w-4 text-foreground-secondary group-hover:text-foreground-active" />
                                <span>Delete</span>
                            </span>
                        </Button>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
        <div className="flex flex-col gap-2">
            {/* Color Row */}
            <div className="grid grid-cols-6 gap-1">
                {[
                    '#1E40AF',
                    '#2563EB',
                    '#3B82F6',
                    '#60A5FA',
                    '#93C5FD',
                    '#BFDBFE',
                    '#DBEAFE',
                    '#EFF6FF',
                    '#F5F9FF',
                    '#FAFCFF',
                ].map((color, index) => (
                    <div key={`brand-color-${index}`} className="relative group">
                        <div
                            className="w-full aspect-square rounded-lg cursor-pointer hover:ring-2 hover:ring-border-primary border border-white/10"
                            style={{ backgroundColor: color }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 [&[data-state=open]]:opacity-100">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-[85%] w-[85%] p-0 bg-black hover:bg-black rounded-md flex items-center justify-center"
                                    >
                                        <Icons.DotsHorizontal className="h-4 w-4 text-white" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    className="rounded-md bg-background p-1 min-w-[140px]"
                                    align="start"
                                    side="bottom"
                                >
                                    <div className="flex items-start gap-2 px-2 py-1 border-b border-border mb-0.5">
                                        <div
                                            className="w-4 h-4 rounded-sm mt-[2px]"
                                            style={{ backgroundColor: color }}
                                        />
                                        <div className="flex flex-col">
                                            <span className="text-sm text-foreground">
                                                Soft Blue
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {color}
                                            </span>
                                        </div>
                                    </div>
                                    <DropdownMenuItem asChild>
                                        <Button
                                            variant="ghost"
                                            className="hover:bg-background-secondary focus:bg-background-secondary w-full rounded-sm group px-2 py-1"
                                        >
                                            <span className="flex w-full text-sm items-center">
                                                <Icons.Pencil className="mr-2 h-4 w-4" />
                                                <span>Edit color</span>
                                            </span>
                                        </Button>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <Button
                                            variant="ghost"
                                            className="hover:bg-background-secondary focus:bg-background-secondary w-full rounded-sm group px-2 py-1"
                                        >
                                            <span className="flex w-full text-sm items-center">
                                                <Icons.Copy className="mr-2 h-4 w-4" />
                                                <span>Duplicate</span>
                                            </span>
                                        </Button>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <Button
                                            variant="ghost"
                                            className="hover:bg-background-secondary focus:bg-background-secondary w-full rounded-sm group px-2 py-1"
                                            onClick={onDelete}
                                        >
                                            <span className="flex w-full text-sm items-center">
                                                <Icons.Trash className="mr-2 h-4 w-4" />
                                                <span>Delete</span>
                                            </span>
                                        </Button>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                ))}
                <Button
                    variant="outline"
                    size="icon"
                    className="w-full aspect-square rounded-lg border border-dashed flex items-center justify-center bg-transparent hover:bg-transparent"
                >
                    <Icons.Plus className="h-4 w-4" />
                </Button>
            </div>
        </div>
    </div>
);

const BrandTab = observer(() => {
    const handleRename = () => {
        // Implement rename logic
    };

    const handleDelete = () => {
        // Implement delete logic
    };

    return (
        <div className="flex flex-col h-[calc(100vh-8.25rem)] text-xs text-active flex-grow w-full p-0">
            <div className="flex flex-col gap-4 px-4 py-[18px] border-b border-border">
                <div className="flex flex-col gap-4">
                    <BrandPalletGroup onRename={handleRename} onDelete={handleDelete} />
                    <BrandPalletGroup onRename={handleRename} onDelete={handleDelete} />
                </div>
                <Button
                    variant="ghost"
                    className="w-full h-10 text-sm text-muted-foreground hover:text-foreground bg-background-secondary hover:bg-background-secondary/70 rounded-lg border border-white/5"
                >
                    Add a new group
                </Button>
            </div>

            {/* Color Palette section */}
            <div className="flex flex-col gap-4 px-4 py-[18px] border-b border-border">
                <div className="flex flex-col gap-4">
                    {/* Grays */}
                    <ColorRow
                        label="Slate"
                        colors={[
                            '#f8fafc',
                            '#f1f5f9',
                            '#e2e8f0',
                            '#cbd5e1',
                            '#94a3b8',
                            '#64748b',
                            '#475569',
                            '#334155',
                            '#1e293b',
                            '#0f172a',
                        ]}
                    />
                    <ColorRow
                        label="Gray"
                        colors={[
                            '#f9fafb',
                            '#f3f4f6',
                            '#e5e7eb',
                            '#d1d5db',
                            '#9ca3af',
                            '#6b7280',
                            '#4b5563',
                            '#374151',
                            '#1f2937',
                            '#111827',
                        ]}
                    />
                    <ColorRow
                        label="Zinc"
                        colors={[
                            '#fafafa',
                            '#f4f4f5',
                            '#e4e4e7',
                            '#d4d4d8',
                            '#a1a1aa',
                            '#71717a',
                            '#52525b',
                            '#3f3f46',
                            '#27272a',
                            '#18181b',
                        ]}
                    />
                    <ColorRow
                        label="Neutral"
                        colors={[
                            '#fafafa',
                            '#f5f5f5',
                            '#e5e5e5',
                            '#d4d4d4',
                            '#a3a3a3',
                            '#737373',
                            '#525252',
                            '#404040',
                            '#262626',
                            '#171717',
                        ]}
                    />
                    <ColorRow
                        label="Stone"
                        colors={[
                            '#fafaf9',
                            '#f5f5f4',
                            '#e7e5e4',
                            '#d6d3d1',
                            '#a8a29e',
                            '#78716c',
                            '#57534e',
                            '#44403c',
                            '#292524',
                            '#1c1917',
                        ]}
                    />

                    {/* Colors */}
                    <ColorRow
                        label="Red"
                        colors={[
                            '#fef2f2',
                            '#fee2e2',
                            '#fecaca',
                            '#fca5a5',
                            '#f87171',
                            '#ef4444',
                            '#dc2626',
                            '#b91c1c',
                            '#991b1b',
                            '#7f1d1d',
                        ]}
                    />
                    <ColorRow
                        label="Orange"
                        colors={[
                            '#fff7ed',
                            '#ffedd5',
                            '#fed7aa',
                            '#fdba74',
                            '#fb923c',
                            '#f97316',
                            '#ea580c',
                            '#c2410c',
                            '#9a3412',
                            '#7c2d12',
                        ]}
                    />
                    <ColorRow
                        label="Amber"
                        colors={[
                            '#fffbeb',
                            '#fef3c7',
                            '#fde68a',
                            '#fcd34d',
                            '#fbbf24',
                            '#f59e0b',
                            '#d97706',
                            '#b45309',
                            '#92400e',
                            '#78350f',
                        ]}
                    />
                    <ColorRow
                        label="Yellow"
                        colors={[
                            '#fefce8',
                            '#fef9c3',
                            '#fef08a',
                            '#fde047',
                            '#facc15',
                            '#eab308',
                            '#ca8a04',
                            '#a16207',
                            '#854d0e',
                            '#713f12',
                        ]}
                    />
                    <ColorRow
                        label="Lime"
                        colors={[
                            '#f7fee7',
                            '#ecfccb',
                            '#d9f99d',
                            '#bef264',
                            '#a3e635',
                            '#84cc16',
                            '#65a30d',
                            '#4d7c0f',
                            '#3f6212',
                            '#365314',
                        ]}
                    />
                    <ColorRow
                        label="Green"
                        colors={[
                            '#f0fdf4',
                            '#dcfce7',
                            '#bbf7d0',
                            '#86efac',
                            '#4ade80',
                            '#22c55e',
                            '#16a34a',
                            '#15803d',
                            '#166534',
                            '#14532d',
                        ]}
                    />
                    <ColorRow
                        label="Emerald"
                        colors={[
                            '#ecfdf5',
                            '#d1fae5',
                            '#a7f3d0',
                            '#6ee7b7',
                            '#34d399',
                            '#10b981',
                            '#059669',
                            '#047857',
                            '#065f46',
                            '#064e3b',
                        ]}
                    />
                    <ColorRow
                        label="Teal"
                        colors={[
                            '#f0fdfa',
                            '#ccfbf1',
                            '#99f6e4',
                            '#5eead4',
                            '#2dd4bf',
                            '#14b8a6',
                            '#0d9488',
                            '#0f766e',
                            '#115e59',
                            '#134e4a',
                        ]}
                    />
                    <ColorRow
                        label="Cyan"
                        colors={[
                            '#ecfeff',
                            '#cffafe',
                            '#a5f3fc',
                            '#67e8f9',
                            '#22d3ee',
                            '#06b6d4',
                            '#0891b2',
                            '#0e7490',
                            '#155e75',
                            '#164e63',
                        ]}
                    />
                    <ColorRow
                        label="Sky"
                        colors={[
                            '#f0f9ff',
                            '#e0f2fe',
                            '#bae6fd',
                            '#7dd3fc',
                            '#38bdf8',
                            '#0ea5e9',
                            '#0284c7',
                            '#0369a1',
                            '#075985',
                            '#0c4a6e',
                        ]}
                    />
                    <ColorRow
                        label="Blue"
                        colors={[
                            '#eff6ff',
                            '#dbeafe',
                            '#bfdbfe',
                            '#93c5fd',
                            '#60a5fa',
                            '#3b82f6',
                            '#2563eb',
                            '#1d4ed8',
                            '#1e40af',
                            '#1e3a8a',
                        ]}
                    />
                    <ColorRow
                        label="Indigo"
                        colors={[
                            '#eef2ff',
                            '#e0e7ff',
                            '#c7d2fe',
                            '#a5b4fc',
                            '#818cf8',
                            '#6366f1',
                            '#4f46e5',
                            '#4338ca',
                            '#3730a3',
                            '#312e81',
                        ]}
                    />
                    <ColorRow
                        label="Violet"
                        colors={[
                            '#f5f3ff',
                            '#ede9fe',
                            '#ddd6fe',
                            '#c4b5fd',
                            '#a78bfa',
                            '#8b5cf6',
                            '#7c3aed',
                            '#6d28d9',
                            '#5b21b6',
                            '#4c1d95',
                        ]}
                    />
                    <ColorRow
                        label="Purple"
                        colors={[
                            '#faf5ff',
                            '#f3e8ff',
                            '#e9d5ff',
                            '#d8b4fe',
                            '#c084fc',
                            '#a855f7',
                            '#9333ea',
                            '#7e22ce',
                            '#6b21a8',
                            '#581c87',
                        ]}
                    />
                    <ColorRow
                        label="Fuchsia"
                        colors={[
                            '#fdf4ff',
                            '#fae8ff',
                            '#f5d0fe',
                            '#f0abfc',
                            '#e879f9',
                            '#d946ef',
                            '#c026d3',
                            '#a21caf',
                            '#86198f',
                            '#701a75',
                        ]}
                    />
                    <ColorRow
                        label="Pink"
                        colors={[
                            '#fdf2f8',
                            '#fce7f3',
                            '#fbcfe8',
                            '#f9a8d4',
                            '#f472b6',
                            '#ec4899',
                            '#db2777',
                            '#be185d',
                            '#9d174d',
                            '#831843',
                        ]}
                    />
                    <ColorRow
                        label="Rose"
                        colors={[
                            '#fff1f2',
                            '#ffe4e6',
                            '#fecdd3',
                            '#fda4af',
                            '#fb7185',
                            '#f43f5e',
                            '#e11d48',
                            '#be123c',
                            '#9f1239',
                            '#881337',
                        ]}
                    />
                </div>
            </div>
        </div>
    );
});

export default BrandTab;

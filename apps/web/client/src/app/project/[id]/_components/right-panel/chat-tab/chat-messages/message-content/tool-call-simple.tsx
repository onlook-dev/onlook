import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';
import React from 'react';

// Map tool names to specific icon components
const TOOL_ICONS: Record<string, any> = {
    'list_files': Icons.ListBullet,
    'read_files': Icons.EyeOpen,
    'read_style_guide': Icons.Brand,
    'onlook_instructions': Icons.OnlookLogo,
    // Add more mappings as needed
};

export function ToolCallSimple({
  toolName,
  label,
  className,
  loading,
}: {
  toolName: string;
  label?: string;
  className?: string;
  loading?: boolean;
}) {
    const Icon = TOOL_ICONS[toolName] || Icons.QuestionMarkCircled;
    return (
        <div className={cn('flex items-center gap-2 ml-2 text-foreground-tertiary/80', className)}>
            <Icon className="w-4 h-4" />
            <span
                className={cn(
                    'text-regularPlus',
                    loading &&
                        'bg-gradient-to-l from-white/20 via-white/90 to-white/20 bg-[length:200%_100%] bg-clip-text text-transparent animate-shimmer filter drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]'
                )}
            >
                {label || toolName}
            </span>
        </div>
    );
} 
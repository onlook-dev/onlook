import React from 'react';
import { Icons } from '@onlook/ui/icons';
import type { AppData } from './index';
import { cn } from '@onlook/ui/utils';

// Company brand colors
const BRAND_COLORS: Record<string, string> = {
    Stripe: '#635BFF',
    MongoDB: '#47A248',
    Figma: '#F24E1E',
    GitHub: '#181717',
    Slack: '#4A154B',
    Notion: '#151515',
    Salesforce: '#00A1E0',
    Airtable: '#18BFFF',
    Twilio: '#F22F46',
};

export interface InstalledAppCardProps {
    app: AppData;
    onClick?: (app: AppData) => void;
    onToggle?: (app: AppData, enabled: boolean) => void;
    className?: string;
    isActive?: boolean;
    anyAppActive?: boolean;
    isHovered?: boolean;
    anyCardHovered?: boolean;
    listId?: string;
    hideDivider?: boolean;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
}

const InstalledAppCard: React.FC<InstalledAppCardProps> = ({
    app,
    onClick,
    onToggle,
    className,
    isActive = false,
    anyAppActive = false,
    isHovered = false,
    anyCardHovered = false,
    listId,
    hideDivider = false,
    onMouseEnter,
    onMouseLeave,
}) => {
    // Never dim active cards or hovered cards
    // Only dim cards that are neither active nor hovered when either:
    // - There's an active card in the list, or
    // - There's a hovered card in the list
    const isDimmed = !isActive && !isHovered && (anyAppActive || anyCardHovered);

    const handleToggleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (onToggle) {
            onToggle(app, e.target.checked);
        }
    };

    const handleManageClick = () => {
        if (onClick) {
            onClick(app);
        }
    };

    // All apps are enabled by default
    const isEnabled = true; // Changed from app.name === 'Stripe'

    return (
        <div
            className={cn(
                `group border border-border border-[0.5px] rounded-lg overflow-hidden relative`,
                `transition-all duration-100`,
                isDimmed ? 'opacity-50' : 'opacity-100',
                isActive && 'bg-background-secondary/50',
                className,
            )}
            onClick={() => onClick && onClick(app)}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            {/* Animated background that scales up on hover */}
            <div className="absolute inset-0 bg-background-secondary/50 opacity-0 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none transform scale-95 group-hover:scale-100 group-hover:opacity-100"></div>

            <div className="p-3 relative">
                {/* Top row with logo and app name */}
                <div className="flex items-center mb-2">
                    <div className="relative">
                        <div
                            className={cn(
                                'flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-md overflow-hidden relative border',
                                'transition-all duration-100',
                                isActive ? 'border-white/20' : 'border-white/[0.07]',
                                'group-hover:border-white/20',
                            )}
                            style={{ backgroundColor: BRAND_COLORS[app.name] || '#ffffff' }}
                        >
                            {app.icon ? (
                                <img
                                    src={app.icon}
                                    alt={`${app.name} logo`}
                                    className="w-5 h-5 object-contain"
                                    style={{ filter: 'brightness(0) invert(1)' }}
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-white text-xl font-semibold">
                                    {app.name.charAt(0)}
                                </div>
                            )}
                        </div>
                        {/* Active indicator dot */}
                        <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#00C781] border border-secondary border-[4px] flex items-center justify-center">
                            <div className="w-1 h-1 bg-black rounded-full opacity-0"></div>
                        </div>
                    </div>
                    <h3 className="text-base font-normal text-white ml-3">{app.name}</h3>
                </div>

                {/* Description row */}
                <div className="w-full">
                    <p className="text-sm text-muted-foreground line-clamp-2 overflow-hidden">
                        Interact with the {app.name} API. This server supports various tools to
                        interact...
                    </p>
                </div>

                <div className="absolute top-3 right-3">
                    <button
                        className="flex items-center justify-center p-2 rounded-lg border-border border-[0.5px] hover:bg-[#222222] text-[#999999]"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleManageClick();
                        }}
                    >
                        <Icons.Gear className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InstalledAppCard;

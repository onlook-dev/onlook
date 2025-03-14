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

    // Check if app is enabled based on name instead of ID
    const isEnabled = app.name === 'Stripe'; // Default: Stripe is enabled

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

            <div className="flex items-center p-4 relative">
                <div
                    className={cn(
                        'flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-md overflow-hidden mr-3 border',
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
                <div className="flex-1 min-w-0">
                    <h3 className="text-base font-normal text-white">{app.name}</h3>
                </div>
            </div>
            <div className="relative">
                <p className="text-sm text-muted-foreground px-4 pb-6">{app.description}</p>
                <div className="flex items-center justify-between px-4 border-t border-border border-t-[0.5px] py-4">
                    <button
                        className="flex items-center justify-center px-3 py-1.5 rounded-md hover:bg-background-secondary border border-border border-[0.5px] text-sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleManageClick();
                        }}
                    >
                        <Icons.Gear className="h-4 w-4 text-muted-foreground mr-1.5" />
                        Manage
                    </button>
                    <div className="relative inline-block w-12 h-6">
                        <input
                            type="checkbox"
                            className="opacity-0 w-0 h-0"
                            defaultChecked={isEnabled}
                            onChange={(e) => {
                                e.stopPropagation();
                                handleToggleChange(e);
                            }}
                        />
                        <span
                            className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-all duration-100 ${isEnabled ? 'bg-[#00C781]' : 'bg-background-secondary'}`}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <span
                                className={`absolute h-5 w-5 left-[2px] bottom-[2px] bg-white rounded-full transition-all duration-100 ${isEnabled ? 'transform translate-x-6' : ''}`}
                            ></span>
                        </span>
                    </div>
                </div>
            </div>

            {/* Bottom divider line - only shown if hideDivider is false */}
            {!hideDivider && (
                <div className="absolute bottom-0 left-4 right-4 h-[0.5px] bg-border"></div>
            )}
        </div>
    );
};

export default InstalledAppCard;

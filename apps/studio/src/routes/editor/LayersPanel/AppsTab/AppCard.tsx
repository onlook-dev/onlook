import React from 'react';
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

export interface AppCardProps {
    app: AppData;
    onClick: (app: AppData) => void;
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

const AppCard: React.FC<AppCardProps> = ({
    app,
    onClick,
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

    return (
        <button
            className={cn(
                'group w-full text-left flex flex-col cursor-pointer flex-grow relative overflow-hidden',
                'transition-all duration-100',
                isActive && 'bg-background-secondary/50',
                className,
            )}
            style={{ opacity: isDimmed ? 0.65 : 1 }}
            onClick={() => onClick(app)}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            {/* Animated background that scales up on hover */}
            <div className="absolute inset-0 bg-background-secondary/50 opacity-0 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none transform scale-90 group-hover:scale-100 group-hover:opacity-100"></div>

            <div className="w-full relative">
                <div className="flex items-center w-full">
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
                                style={{ filter: 'brightness(0) invert(1)' }} // Make SVG white
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-white text-xl font-semibold">
                                {app.name.charAt(0)}
                            </div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0 flex items-center">
                        <h3 className="text-base font-normal text-white">{app.name}</h3>
                    </div>
                </div>
                <p className="text-sm text-gray-400 mt-2 line-clamp-2">{app.description}</p>
            </div>

            {/* Bottom divider line - only shown if hideDivider is false */}
            {!hideDivider && (
                <div className="absolute bottom-0 left-4 right-4 h-[0.5px] bg-border"></div>
            )}
        </button>
    );
};

export default AppCard;

import React from 'react';
import { Icons } from '@onlook/ui/icons';
import type { AppData } from './index';

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
}

const InstalledAppCard: React.FC<InstalledAppCardProps> = ({
    app,
    onClick,
    onToggle,
    className,
}) => {
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

    const isEnabled = app.id === '1'; // Default: Stripe is enabled

    return (
        <div
            className={`border border-border border-[0.5px] rounded-lg overflow-hidden ${className || ''}`}
        >
            <div className="flex items-center p-4">
                <div
                    className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-md overflow-hidden mr-3 border border-white/[0.07]"
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
            <div className=" ">
                <p className="text-sm text-muted-foreground px-4 pb-6">{app.description}</p>
                <div className="flex items-center justify-between px-4 border-t border-border border-t-[0.5px] py-4">
                    <button
                        className="flex items-center justify-center px-3 py-1.5 rounded-md hover:bg-background-secondary border border-border border-[0.5px] text-sm"
                        onClick={handleManageClick}
                    >
                        <Icons.Gear className="h-4 w-4 text-muted-foreground mr-1.5" />
                        Manage
                    </button>
                    <div className="relative inline-block w-12 h-6">
                        <input
                            type="checkbox"
                            className="opacity-0 w-0 h-0"
                            defaultChecked={isEnabled}
                            onChange={handleToggleChange}
                        />
                        <span
                            className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-all duration-300 ${isEnabled ? 'bg-[#00C781]' : 'bg-background-secondary'}`}
                        >
                            <span
                                className={`absolute h-5 w-5 left-[2px] bottom-[2px] bg-white rounded-full transition-all duration-300 ${isEnabled ? 'transform translate-x-6' : ''}`}
                            ></span>
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InstalledAppCard;

import React from 'react';
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

export interface AppCardProps {
    app: AppData;
    onClick: (app: AppData) => void;
}

const AppCard: React.FC<AppCardProps> = ({ app, onClick }) => {
    return (
        <button
            className="w-full text-left flex flex-col py-4 cursor-pointer"
            onClick={() => onClick(app)}
        >
            <div>
                <div className="flex items-center">
                    <div
                        className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-md overflow-hidden mr-3 border border-white/[0.07]"
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
        </button>
    );
};

export default AppCard;

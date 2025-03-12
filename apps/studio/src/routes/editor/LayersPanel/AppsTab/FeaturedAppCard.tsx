import React from 'react';

export interface AppData {
    id: string;
    name: string;
    description: string;
    icon: string;
}

export interface FeaturedAppCardProps {
    app: AppData;
    onClick: (app: AppData) => void;
}

const FeaturedAppCard: React.FC<FeaturedAppCardProps> = ({ app, onClick }) => {
    return (
        <button
            className="w-full text-left flex flex-col rounded-lg overflow-hidden border border-border cursor-pointer"
            onClick={() => onClick(app)}
        >
            <div className="p-3">
                <div className="flex items-center">
                    <div className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-md text-white text-xl font-semibold mr-3 bg-background-secondary">
                        {app.icon || 'S'}
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

export default FeaturedAppCard;

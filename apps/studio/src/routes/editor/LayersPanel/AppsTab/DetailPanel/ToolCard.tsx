import React, { useState } from 'react';
import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';

// Import the AppIcon component or create a placeholder
interface AppIconProps {
    size?: 'sm' | 'md' | 'lg';
}

const AppIcon: React.FC<AppIconProps> = ({ size = 'md' }) => {
    const sizeClasses = {
        sm: 'w-6 h-6 text-xl',
        md: 'w-8 h-8 text-2xl',
        lg: 'w-[60px] h-[60px] text-[32px]',
    };

    return (
        <div
            className={`flex items-center justify-center rounded-md bg-background-secondary text-white font-semibold border border-white/[0.07] ${sizeClasses[size]}`}
        ></div>
    );
};

export interface ToolInputProps {
    label: string;
    type: string;
    description: string;
}

export interface ToolProps {
    name: string;
    description?: string;
    inputs?: ToolInputProps[];
    icon?: React.ReactNode;
}

const ToolCard: React.FC<ToolProps> = ({ name, description, inputs, icon }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="border-b border-border last:border-b-0">
            <div
                className="flex items-center py-3 px-3 cursor-pointer"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="mr-3">{icon || <AppIcon size="sm" />}</div>
                <div className="flex-1">
                    <h3 className="text-base font-normal text-white">{name}</h3>
                </div>
                <div>
                    <Icons.ChevronDown
                        className={cn(
                            'h-5 w-5 text-gray-400 transition-transform',
                            isExpanded ? 'transform rotate-180' : '',
                        )}
                    />
                </div>
            </div>

            {isExpanded && (
                <div className="px-3 pb-5">
                    {description && (
                        <p className="text-sm font-normal text-muted-foreground mb-4 ml-[42px]">
                            {description}
                        </p>
                    )}

                    {inputs && inputs.length > 0 && (
                        <div className="rounded-md overflow-hidden border border-border">
                            <div className="bg-background-secondary/60 px-3 py-2">
                                <div className="flex text-sm font-normal">
                                    <div className="w-1/3 text-gray-400">Input</div>
                                    <div className="w-2/3 text-gray-400">Description</div>
                                </div>
                            </div>

                            {inputs.map((input, index) => (
                                <div key={index} className="border-t border-border">
                                    <div className="flex px-3 py-3">
                                        <div className="w-1/3 flex flex-col gap-[2px]">
                                            <div className="text-white text-sm">{input.label}</div>
                                            <div className="text-muted-foreground text-xs">
                                                {input.type}
                                            </div>
                                        </div>
                                        <div className="w-2/3 text-sm text-white">
                                            {input.description}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ToolCard;

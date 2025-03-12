import React, { useState } from 'react';
import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';

// Import the StripeIcon component or create a placeholder
interface StripeIconProps {
    size?: 'sm' | 'md' | 'lg';
}

const StripeIcon: React.FC<StripeIconProps> = ({ size = 'md' }) => {
    const sizeClasses = {
        sm: 'w-8 h-8 text-xl',
        md: 'w-10 h-10 text-2xl',
        lg: 'w-[60px] h-[60px] text-[32px]',
    };

    return (
        <div
            className={`flex items-center justify-center rounded-md bg-indigo-600 text-white font-semibold ${sizeClasses[size]}`}
        >
            S
        </div>
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
        <div className="border border-border rounded-md overflow-hidden">
            <div
                className="flex items-center py-3 px-3 cursor-pointer"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="mr-3">{icon || <StripeIcon size="sm" />}</div>
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
                <div className="px-3 pb-3">
                    {description && <p className="text-sm text-gray-400 mb-4">{description}</p>}

                    {inputs && inputs.length > 0 && (
                        <div>
                            <div className="bg-background-secondary/20 rounded-md p-3">
                                <div className="flex text-sm font-normal text-gray-400 pb-2">
                                    <div className="w-1/3">Input</div>
                                    <div className="w-2/3">Description</div>
                                </div>
                                {inputs.map((input, index) => (
                                    <div key={index} className="flex py-2 border-t border-border">
                                        <div className="w-1/3 pr-2">
                                            <div className="text-sm text-white">{input.label}</div>
                                            <div className="text-xs text-gray-500">
                                                {input.type}
                                            </div>
                                        </div>
                                        <div className="w-2/3 text-sm text-white">
                                            {input.description}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ToolCard;

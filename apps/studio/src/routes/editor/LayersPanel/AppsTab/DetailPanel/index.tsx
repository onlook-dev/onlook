import React, { useState } from 'react';
import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';
import { Input } from '@onlook/ui/input';
import { Button } from '@onlook/ui/button';
import ToolCard from './ToolCard';
import type { ToolInputProps, ToolProps } from './ToolCard';
import type { AppData } from '../index';

const AppIcon: React.FC<{
    size?: 'sm' | 'md' | 'lg';
    icon?: string;
    name: string;
    className?: string;
}> = ({ size = 'md', icon, name, className }) => {
    const sizeClasses = {
        sm: 'w-8 h-8 text-xl',
        md: 'w-10 h-10 text-2xl',
        lg: 'w-[72px] h-[72px] text-[32px]',
    };

    return (
        <div
            className={cn(
                `flex items-center justify-center rounded-md bg-background-secondary text-white font-semibold ${sizeClasses[size]}`,
                className,
            )}
        ></div>
    );
};

interface DetailPanelProps {
    onClose: () => void;
    app?: AppData;
}

const DetailPanel: React.FC<DetailPanelProps> = ({ onClose, app }) => {
    const [apiKey, setApiKey] = useState('');
    const appName = app?.name || 'Stripe';

    return (
        <div className="flex flex-col h-full text-white w-full">
            {/* Header */}
            <div className="px-4 py-4 flex items-center justify-between border-b border-border border-b-[0.5px]">
                <div className="h-9 flex items-center justify-between w-full">
                    <h2 className="text-base font-normal">{appName}</h2>
                    <button className="text-white hover:text-gray-300" onClick={onClose}>
                        <Icons.CrossL className="h-4 w-4" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                {/* Logo Section */}
                <div className="flex flex-col items-center bg-background justify-center text-center py-10 border-b border-border border-b-[0.5px] relative overflow-hidden">
                    <AppIcon size="lg" icon={app?.icon} name={appName} />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-full aspect-square relative flex items-center justify-center">
                            <svg
                                className="absolute w-[130%] h-[130%] z-7"
                                style={{
                                    transform: 'translate(-50%, -50%)',
                                    top: '50%',
                                    left: '50%',
                                }}
                            >
                                <circle
                                    cx="50%"
                                    cy="50%"
                                    r="49%"
                                    fill="white"
                                    fillOpacity="0.01"
                                    className="stroke-border"
                                    style={{ strokeWidth: '1px', strokeDasharray: '4px 4px' }}
                                />
                            </svg>
                            <svg
                                className="absolute w-[90%] h-[90%] z-8"
                                style={{
                                    transform: 'translate(-50%, -50%)',
                                    top: '50%',
                                    left: '50%',
                                }}
                            >
                                <circle
                                    cx="50%"
                                    cy="50%"
                                    r="49%"
                                    fill="white"
                                    fillOpacity="0.01"
                                    className="stroke-border"
                                    style={{ strokeWidth: '1px', strokeDasharray: '4px 4px' }}
                                />
                            </svg>
                            <svg
                                className="absolute w-[65%] h-[65%] z-9"
                                style={{
                                    transform: 'translate(-50%, -50%)',
                                    top: '50%',
                                    left: '50%',
                                }}
                            >
                                <circle
                                    cx="50%"
                                    cy="50%"
                                    r="49%"
                                    fill="white"
                                    fillOpacity="0.01"
                                    className="stroke-border"
                                    style={{ strokeWidth: '1px', strokeDasharray: '4px 4px' }}
                                />
                            </svg>
                            <svg
                                className="absolute w-[40%] h-[40%] z-10"
                                style={{
                                    transform: 'translate(-50%, -50%)',
                                    top: '50%',
                                    left: '50%',
                                }}
                            >
                                <circle
                                    cx="50%"
                                    cy="50%"
                                    r="49%"
                                    fill="white"
                                    fillOpacity="0.01"
                                    className="stroke-border"
                                    style={{ strokeWidth: '1px', strokeDasharray: '4px 4px' }}
                                />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Description */}
                <div className="px-4 py-5 text-[15px] leading-normal border-b border-border border-b-[0.5px]">
                    <p>
                        {app?.description ||
                            'The Stripe Model Context Protocol server allows you to integrate with Stripe APIs through function calling. This protocol supports various tools to interact with different Stripe services.'}
                    </p>
                </div>

                {/* Install Section */}
                <div className="px-4 py-5 border-b border-border border-b-[0.5px]">
                    <h3 className="text-base font-normal mb-2">Add stripe</h3>
                    <div className="flex items-center mb-2">
                        <div className="text-muted-foreground text-sm font-normal">
                            Requirements
                        </div>
                        <div className="ml-auto">
                            <div className="w-6 h-6 rounded-full text-white text-xs flex items-center justify-center bg-background-secondary border border-border">
                                ?
                            </div>
                        </div>
                    </div>

                    <div className="flex mb-3">
                        <div className="relative flex-1">
                            <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                                <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path
                                        d="M12 17V17.01M12 14C12 11.7909 13.7909 10 16 10C18.2091 10 20 11.7909 20 14C20 16.2091 18.2091 18 16 18H8C5.79086 18 4 16.2091 4 14C4 11.7909 5.79086 10 8 10C10.2091 10 12 11.7909 12 14Z"
                                        stroke="#666666"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                            </div>
                            <Input
                                type="password"
                                placeholder="Enter your Stripe API key"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                className="pl-9 py-6 border-border rounded-md text-white w-full"
                            />
                        </div>
                    </div>

                    <Button className="w-full bg-background-secondary hover:bg-background-secondary/90 text-white text-sm font-medium py-6 rounded-md">
                        Install on your project
                    </Button>
                </div>

                {/* Available Tools */}
                <div className="px-4 pt-6 pb-12">
                    <h3 className="text-sm font-normal mb-3 text-muted-foreground">
                        Available tools
                    </h3>

                    <div className="border border-border rounded-md overflow-hidden">
                        <ToolCard
                            name="Create a new customer"
                            description="This tool will create a new customer in Stripe."
                            icon={
                                <AppIcon
                                    size="sm"
                                    icon={app?.icon}
                                    name={appName}
                                    className="bg-background-secondary"
                                />
                            }
                            inputs={[
                                {
                                    label: 'Email',
                                    type: 'String',
                                    description: 'The email address of the customer.',
                                },
                                {
                                    label: 'Name',
                                    type: 'String',
                                    description: 'The name of the customer.',
                                },
                            ]}
                        />
                        <ToolCard
                            name="Create a new product"
                            description="This tool will create a new product in Stripe."
                            icon={
                                <AppIcon
                                    size="sm"
                                    icon={app?.icon}
                                    name={appName}
                                    className="bg-background-secondary"
                                />
                            }
                            inputs={[
                                {
                                    label: 'Name',
                                    type: 'String',
                                    description: 'The name of the product.',
                                },
                                {
                                    label: 'Description',
                                    type: 'String',
                                    description: 'The description of the product.',
                                },
                            ]}
                        />
                        <ToolCard
                            name="Create a new payment link"
                            description="This tool will create a payment link in Stripe."
                            icon={
                                <AppIcon
                                    size="sm"
                                    icon={app?.icon}
                                    name={appName}
                                    className="bg-background-secondary"
                                />
                            }
                            inputs={[
                                {
                                    label: 'Price',
                                    type: 'String',
                                    description:
                                        'The ID of the price to create the payment link for.',
                                },
                                {
                                    label: 'Quantity',
                                    type: 'Integer',
                                    description:
                                        'The quantity of the product to include in the payment link.',
                                },
                            ]}
                        />
                        <ToolCard
                            name="Read product information"
                            description="This tool will retrieve information about a product in Stripe."
                            icon={
                                <AppIcon
                                    size="sm"
                                    icon={app?.icon}
                                    name={appName}
                                    className="bg-background-secondary"
                                />
                            }
                            inputs={[
                                {
                                    label: 'Product ID',
                                    type: 'String',
                                    description:
                                        'The ID of the product to retrieve information for.',
                                },
                            ]}
                        />
                        <ToolCard
                            name="Create a new price"
                            description="This tool will create a new price for a product in Stripe."
                            icon={
                                <AppIcon
                                    size="sm"
                                    icon={app?.icon}
                                    name={appName}
                                    className="bg-background-secondary"
                                />
                            }
                            inputs={[
                                {
                                    label: 'Product ID',
                                    type: 'String',
                                    description: 'The ID of the product to create a price for.',
                                },
                                {
                                    label: 'Unit Amount',
                                    type: 'Integer',
                                    description: 'The amount in cents to charge per unit.',
                                },
                                {
                                    label: 'Currency',
                                    type: 'String',
                                    description: 'Three-letter ISO currency code (e.g., usd, eur).',
                                },
                            ]}
                        />
                        <ToolCard
                            name="List all products"
                            description="This tool will list all products in your Stripe account."
                            icon={
                                <AppIcon
                                    size="sm"
                                    icon={app?.icon}
                                    name={appName}
                                    className="bg-background-secondary"
                                />
                            }
                            inputs={[
                                {
                                    label: 'Limit',
                                    type: 'Integer',
                                    description: 'Maximum number of products to return.',
                                },
                                {
                                    label: 'Active',
                                    type: 'Boolean',
                                    description: 'Filter for active or inactive products.',
                                },
                            ]}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DetailPanel;

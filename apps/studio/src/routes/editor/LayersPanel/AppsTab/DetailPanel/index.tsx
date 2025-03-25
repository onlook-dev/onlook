import React, { useState } from 'react';
import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';
import { Input } from '@onlook/ui/input';
import { Button } from '@onlook/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import ToolCard from './ToolCard';
import type { ToolInputProps, ToolProps } from './ToolCard';
import type { AppData } from '../index';

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

const AppIcon: React.FC<{
    size?: 'sm' | 'md' | 'lg';
    icon?: string;
    name: string;
    className?: string;
}> = ({ size = 'md', icon, name, className }) => {
    const sizeClasses = {
        sm: 'w-7 h-7 text-xl',
        md: 'w-8 h-8 text-2xl',
        lg: 'w-[72px] h-[72px] text-[32px]',
    };

    return (
        <div
            className={cn(
                `flex items-center justify-center rounded-md text-white font-semibold ${sizeClasses[size]} border border-white/[0.07]`,
                className,
            )}
            style={{ backgroundColor: BRAND_COLORS[name] || '#ffffff' }}
        >
            {icon ? (
                <img
                    src={icon}
                    alt={`${name} logo`}
                    className="w-1/2 h-1/2 object-contain"
                    style={{ filter: 'brightness(0) invert(1)' }}
                />
            ) : (
                <div className="flex items-center justify-center text-white font-semibold">
                    {name.charAt(0)}
                </div>
            )}
        </div>
    );
};

interface DetailPanelProps {
    onClose: () => void;
    app?: AppData;
}

const DetailPanel: React.FC<DetailPanelProps> = ({ onClose, app }) => {
    const [apiKey, setApiKey] = useState('');
    const appName = app?.name || 'Stripe';
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isChecked, setIsChecked] = useState(true);

    const handleDisable = () => {
        setIsChecked(!isChecked);
        console.log(`Toggling check for ${appName}`);
    };

    const handleDelete = () => {
        // Implement delete functionality
        console.log(`Deleting ${appName}`);
    };

    return (
        <div className="flex flex-col h-full text-white w-full">
            {/* Header */}
            <div className="px-4 py-4 flex items-center justify-between border-b border-border border-b-[0.5px]">
                <div className="h-9 flex items-center justify-between w-full">
                    <div className="flex items-center">
                        <h2 className="text-base font-normal">{appName}</h2>
                        <div className="mx-4 h-6 w-[1px] bg-border"></div>
                        <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
                            <DropdownMenuTrigger className="flex items-center text-base font-normal hover:bg-transparent focus:outline-none">
                                <div
                                    className={`flex items-center ${isDropdownOpen ? 'text-white' : 'text-muted-foreground'}`}
                                >
                                    <div className="w-4 h-4 mr-1.5 rounded-full bg-[#00C781] border border-secondary border-[4.5px] flex items-center justify-center"></div>
                                    <div className="w-4 h-4 mr-1.5 rounded-full bg-red-500 border border-secondary border-[4.5px] flex items-center justify-center"></div>
                                    <div className="w-4 h-4 mr-1.5 rounded-full bg-white/25 border border-secondary border-[4.5px] flex items-center justify-center"></div>

                                    <span className="mr-1.5 text-sm">Active</span>
                                    {isDropdownOpen ? (
                                        <Icons.ChevronUp className="h-4 w-4 text-white" />
                                    ) : (
                                        <Icons.ChevronDown className="h-4 w-4 text-muted-foreground" />
                                    )}
                                </div>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                align="start"
                                className="rounded-md bg-background p-1 min-w-[140px]"
                                side="bottom"
                            >
                                <DropdownMenuItem asChild>
                                    <Button
                                        variant="ghost"
                                        className="hover:bg-background-secondary focus:bg-background-secondary w-full rounded-md group px-2 py-0.5"
                                        onClick={handleDisable}
                                    >
                                        <span className="flex w-full font-normal text-sm items-center">
                                            {isChecked ? (
                                                <Icons.Check className="mr-2 h-4 w-4 text-foreground-secondary group-hover:text-foreground-active" />
                                            ) : (
                                                <div className="mr-2 h-4 w-4" />
                                            )}
                                            <span>Disable</span>
                                        </span>
                                    </Button>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Button
                                        variant="ghost"
                                        className="hover:bg-background-secondary focus:bg-background-secondary w-full rounded-md group px-2 py-0.5"
                                        onClick={handleDelete}
                                    >
                                        <span className="flex w-full font-normal text-sm items-center">
                                            <Icons.Trash className="mr-2 h-4 w-4 text-foreground-secondary group-hover:text-foreground-active" />
                                            <span>Delete</span>
                                        </span>
                                    </Button>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                    <button
                        className="text-muted-foreground hover:text-foreground p-2 rounded-md hover:bg-background-secondary transition-colors"
                        onClick={onClose}
                    >
                        <Icons.CrossL className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Error Bar */}
            <div className="flex hidden items-center justify-between px-4 py-2 border-b border-border border-b-[0.5px]">
                <div className="flex items-center">
                    <div className="flex items-center justify-center w-6 h-6 mr-1">
                        <Icons.CrossCircled className="w-5 h-5 text-red-500" />
                    </div>
                    <span className="text-sm text-white">SSE error: Non-200 status code (500)</span>
                </div>
                <Button
                    variant="outline"
                    className="flex px-2 py-0 h-8 items-center text-sm font-normal bg-transparent border border-border hover:bg-background-secondary"
                >
                    <Icons.Sparkles className="w-4 h-4 mr-1.5" />
                    Fix in chat
                </Button>
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
                <div className="px-4 py-5 text-base font-normal leading-normal border-b border-border border-b-[0.5px]">
                    <p>
                        {app?.description ||
                            'The Stripe Model Context Protocol server allows you to integrate with Stripe APIs through function calling. This protocol supports various tools to interact with different Stripe services.'}
                    </p>
                </div>

                {/* Install Section */}
                <div className="px-4 py-5 border-b border-border border-b-[0.5px]">
                    <h3 className="text-base font-normal mb-2">Add {appName}</h3>
                    <div className="flex items-center mb-2">
                        <div className="text-muted-foreground text-sm font-normal">
                            Requirements
                        </div>
                        <div className="ml-auto">
                            <div className="w-5 h-5 rounded-full text-white text-[10px] flex items-center justify-center bg-background-secondary border border-border">
                                ?
                            </div>
                        </div>
                    </div>

                    <div className="flex mb-2">
                        <div className="relative flex-1">
                            <div
                                className="absolute left-3 top-1/2 p-1 bg-background-secondary rounded-md transform -translate-y-1/2 border-white/10"
                                style={{ borderWidth: '0.5px' }}
                            >
                                <svg
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path
                                        d="M17 8.99994C17 8.48812 16.8047 7.9763 16.4142 7.58579C16.0237 7.19526 15.5118 7 15 7M15 15C18.3137 15 21 12.3137 21 9C21 5.68629 18.3137 3 15 3C11.6863 3 9 5.68629 9 9C9 9.27368 9.01832 9.54308 9.05381 9.80704C9.11218 10.2412 9.14136 10.4583 9.12172 10.5956C9.10125 10.7387 9.0752 10.8157 9.00469 10.9419C8.937 11.063 8.81771 11.1823 8.57913 11.4209L3.46863 16.5314C3.29568 16.7043 3.2092 16.7908 3.14736 16.8917C3.09253 16.9812 3.05213 17.0787 3.02763 17.1808C3 17.2959 3 17.4182 3 17.6627V19.4C3 19.9601 3 20.2401 3.10899 20.454C3.20487 20.6422 3.35785 20.7951 3.54601 20.891C3.75992 21 4.03995 21 4.6 21H7V19H9V17H11L12.5791 15.4209C12.8177 15.1823 12.937 15.063 13.0581 14.9953C13.1843 14.9248 13.2613 14.8987 13.4044 14.8783C13.5417 14.8586 13.7588 14.8878 14.193 14.9462C14.4569 14.9817 14.7263 15 15 15Z"
                                        stroke="white"
                                        stroke-width="1"
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                    />
                                </svg>
                            </div>
                            <Input
                                type="password"
                                placeholder="Enter your Stripe API key"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                className="pl-12 py-6 border-border rounded-md font-normal text-sm text-white w-full"
                            />
                        </div>
                    </div>

                    <div className="flex mb-2">
                        <div className="relative flex-1">
                            <div
                                className="absolute left-3 top-1/2 p-1 bg-background-secondary rounded-md transform -translate-y-1/2 border-white/10"
                                style={{ borderWidth: '0.5px' }}
                            >
                                <Icons.Link className="h-[18px] w-[18px] text-white" />
                            </div>
                            <div className="flex">
                                <div className="pl-12 py-2 border border-border border-r-0 rounded-l-md rounded-r-[0px] font-normal text-sm text-muted-foreground w-full flex items-center">
                                    https://mcp.onlook.com/.../stripe-012G
                                </div>
                                <Button className="rounded-l-none rounded-r-md bg-background-none hover:bg-background-secondary/90 text-white text-sm font-medium py-6 px-4 border border-border">
                                    Authenticate
                                    <Icons.ExternalLink className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    <Button className="w-full bg-background-secondary hover:bg-background-secondary/90 text-white text-base font-medium py-7 rounded-md">
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

import React, { useState } from 'react';
import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';
import { Input } from '@onlook/ui/input';
import { Button } from '@onlook/ui/button';

interface ToolInputProps {
    label: string;
    type: string;
    description: string;
}

interface ToolProps {
    name: string;
    description?: string;
    inputs?: ToolInputProps[];
    icon?: React.ReactNode;
}

interface StripeIntegrationProps {
    onClose?: () => void;
}

const StripeIcon: React.FC = () => (
    <div className="w-10 h-10 bg-indigo-500 rounded-md flex items-center justify-center text-white text-2xl font-bold">
        S
    </div>
);

const ToolCard: React.FC<ToolProps> = ({ name, description, inputs, icon }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="border-t border-border">
            <div
                className="flex items-center py-4 px-4 cursor-pointer"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="mr-3">{icon || <StripeIcon />}</div>
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

            {isExpanded && description && (
                <div className="px-4 pb-4">
                    <p className="text-sm text-gray-400 mb-4">{description}</p>

                    {inputs && inputs.length > 0 && (
                        <div className="mt-4">
                            <div className="bg-background-secondary rounded-md p-4">
                                <table className="w-full">
                                    <thead>
                                        <tr>
                                            <th className="text-left text-sm font-normal text-gray-400 pb-2">
                                                Input
                                            </th>
                                            <th className="text-left text-sm font-normal text-gray-400 pb-2">
                                                Description
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {inputs.map((input, index) => (
                                            <tr key={index}>
                                                <td className="py-2 pr-4 align-top">
                                                    <div className="text-sm text-white">
                                                        {input.label}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {input.type}
                                                    </div>
                                                </td>
                                                <td className="py-2 text-sm text-white align-top">
                                                    {input.description}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const StripeIntegration: React.FC<StripeIntegrationProps> = ({ onClose }) => {
    const [apiKey, setApiKey] = useState('');

    console.log('StripeIntegration rendered');

    return (
        <div className="flex flex-col h-full bg-background text-white w-[450px]">
            <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="text-xl font-medium">Stripe</h2>
                <button className="text-gray-400 hover:text-white" onClick={onClose}>
                    <Icons.CrossS className="h-5 w-5" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto">
                <div className="p-4 flex flex-col items-center justify-center text-center">
                    <StripeIcon />
                    <h3 className="mt-4 text-lg font-medium">
                        The Stripe Model Context Protocol server
                    </h3>
                    <p className="mt-2 text-sm text-gray-400">
                        allows you to integrate with Stripe APIs through function calling. This
                        protocol supports various tools to interact with different Stripe services.
                    </p>
                </div>

                <div className="border-t border-border mt-4">
                    <div className="p-4">
                        <h3 className="text-lg font-medium mb-2">Add stripe</h3>
                        <p className="text-sm text-gray-400 mb-4">Requirements</p>

                        <div className="relative mb-4">
                            <Input
                                type="password"
                                placeholder="Enter your Stripe API key"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                className="pl-9 bg-background-secondary border-border"
                            />
                            <Icons.LockClosed className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        </div>

                        <Button className="w-full bg-background-secondary hover:bg-background-secondary/90 text-white">
                            Install on your project
                        </Button>
                    </div>
                </div>

                <div className="border-t border-border mt-4">
                    <div className="p-4">
                        <h3 className="text-lg font-medium mb-2">Available tools</h3>

                        <div className="mt-2">
                            <ToolCard name="Create a new customer" icon={<StripeIcon />} />

                            <ToolCard name="Create a new product" icon={<StripeIcon />} />

                            <ToolCard
                                name="Create a new payment link"
                                description="This tool will create a payment link in Stripe."
                                icon={<StripeIcon />}
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

                            <ToolCard name="Read product information" icon={<StripeIcon />} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StripeIntegration;

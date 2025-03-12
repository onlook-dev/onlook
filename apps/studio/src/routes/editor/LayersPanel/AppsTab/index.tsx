import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';
import { Input } from '@onlook/ui/input';
import { useTranslation } from 'react-i18next';

// Sample data for app categories
const APP_CATEGORIES = [
    { id: 'payments', name: 'Payments' },
    { id: 'database', name: 'Database' },
    { id: 'marketing', name: 'Marketing' },
];

// Sample data for featured apps
const FEATURED_APPS = [
    {
        id: '1',
        name: 'Stripe',
        description: 'Interact with the Stripe API. This server supports...',
        icon: '',
    },
    {
        id: '2',
        name: 'Stripe',
        description: 'Interact with the Stripe API. This server supports...',
        icon: '',
    },
];

// Sample data for all apps
const ALL_APPS = [
    {
        id: '1',
        name: 'Stripe',
        description:
            'Interact with the Stripe API. This server supports various tools to interact...',
        icon: '',
    },
    {
        id: '2',
        name: 'Stripe',
        description:
            'Interact with the Stripe API. This server supports various tools to interact...',
        icon: '',
    },
    {
        id: '3',
        name: 'Stripe',
        description:
            'Interact with the Stripe API. This server supports various tools to interact...',
        icon: '',
    },
    {
        id: '4',
        name: 'Stripe',
        description:
            'Interact with the Stripe API. This server supports various tools to interact...',
        icon: '',
    },
    {
        id: '5',
        name: 'Stripe',
        description:
            'Interact with the Stripe API. This server supports various tools to interact...',
        icon: '',
    },
    {
        id: '6',
        name: 'Stripe',
        description:
            'Interact with the Stripe API. This server supports various tools to interact...',
        icon: '',
    },
];

// Sort options
const SORT_OPTIONS = [
    { id: 'newest', name: 'Newest' },
    { id: 'popular', name: 'Popular' },
    { id: 'alphabetical', name: 'A-Z' },
];

interface AppData {
    id: string;
    name: string;
    description: string;
    icon: string;
}

interface AppCardProps {
    app: AppData;
}

// Regular app card for the All Apps section
const AppCard: React.FC<AppCardProps> = ({ app }) => {
    return (
        <div className="flex flex-col py-4">
            <div>
                <div className="flex items-center">
                    <div className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-md text-white text-xl font-semibold mr-3 bg-background-secondary">
                        {app.icon}
                    </div>
                    <div className="flex-1 min-w-0 flex items-center">
                        <h3 className="text-base font-normal text-white">{app.name}</h3>
                    </div>
                </div>
                <p className="text-sm text-gray-400 mt-2 line-clamp-2">{app.description}</p>
            </div>
        </div>
    );
};

// Featured app card for the Featured section
interface FeaturedAppCardProps {
    app: AppData;
}

const FeaturedAppCard: React.FC<FeaturedAppCardProps> = ({ app }) => {
    return (
        <div className="flex flex-col rounded-lg overflow-hidden border border-border">
            <div className="p-3">
                <div className="flex items-center">
                    <div className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-md text-white text-xl font-semibold mr-3 bg-background-secondary">
                        {app.icon}
                    </div>
                    <div className="flex-1 min-w-0 flex items-center">
                        <h3 className="text-base font-normal text-white">{app.name}</h3>
                    </div>
                </div>
                <p className="text-sm text-gray-400 mt-2 line-clamp-2">{app.description}</p>
            </div>
        </div>
    );
};

const AppsTab: React.FC = () => {
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'browse' | 'installed'>('browse');
    const [sortOption, setSortOption] = useState('newest');

    // Filter apps based on search query
    const filteredApps = ALL_APPS.filter((app) => {
        return (
            app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            app.description.toLowerCase().includes(searchQuery.toLowerCase())
        );
    });

    return (
        <div className="w-full h-full flex flex-col text-xs text-active overflow-hidden">
            {/* Search Bar */}
            <div className="px-4 py-3 border-b border-border">
                <div className="relative">
                    <Icons.MagnifyingGlass className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search apps..."
                        className="h-9 text-xs pl-7 pr-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                                setSearchQuery('');
                                (e.target as HTMLInputElement).blur();
                            }
                        }}
                    />
                    {searchQuery && (
                        <button
                            className="absolute right-[1px] top-[1px] bottom-[1px] aspect-square hover:bg-background-onlook active:bg-transparent flex items-center justify-center rounded-r-[calc(theme(borderRadius.md)-1px)] group"
                            onClick={() => setSearchQuery('')}
                        >
                            <Icons.CrossS className="h-3 w-3 text-foreground-primary/50 group-hover:text-foreground-primary" />
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex px-4 border-b border-border">
                <button
                    className={cn(
                        'flex-1 py-3 text-sm font-normal',
                        activeTab === 'browse'
                            ? 'text-foreground border-b border-foreground'
                            : 'text-muted-foreground',
                    )}
                    onClick={() => setActiveTab('browse')}
                >
                    Browse
                </button>
                <button
                    className={cn(
                        'flex-1 py-3 text-sm font-normal',
                        activeTab === 'installed'
                            ? 'text-foreground border-b border-foreground'
                            : 'text-muted-foreground',
                    )}
                    onClick={() => setActiveTab('installed')}
                >
                    Installed Apps
                </button>
            </div>

            {/* Main Content - Scrollable */}
            <div className="flex-1 overflow-y-auto">
                {activeTab === 'browse' && (
                    <>
                        {/* Categories */}
                        <div className="flex p-4 space-x-1.5 overflow-x-auto">
                            {APP_CATEGORIES.map((category) => (
                                <button
                                    key={category.id}
                                    className="px-3 py-1.5 text-sm font-normal rounded-lg text-muted-foreground whitespace-nowrap border-border border bg-transparent"
                                >
                                    {category.name}
                                </button>
                            ))}
                        </div>

                        {/* Featured Apps */}
                        <div className="pt-1 pb-6 border-b border-border">
                            <div className="flex items-center justify-between px-4 mb-3">
                                <h2 className="text-sm font-normal text-muted-foreground">
                                    Featured
                                </h2>
                                <div className="flex space-x-1">
                                    <button className="p-1 text-muted-foreground hover:text-foreground">
                                        <Icons.ArrowLeft className="h-4 w-4" />
                                    </button>
                                    <button className="p-1 text-muted-foreground hover:text-foreground">
                                        <Icons.ArrowRight className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                            <div className="flex px-4 overflow-x-auto">
                                {FEATURED_APPS.map((app) => (
                                    <div
                                        key={app.id}
                                        className="min-w-[225px] max-w-[250px] mr-1.5"
                                    >
                                        <FeaturedAppCard app={app} />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* All Apps */}
                        <div className="px-4 pt-6 pb-4">
                            <div className="flex items-center justify-between mb-1">
                                <h2 className="text-sm font-normal text-muted-foreground">
                                    All apps
                                </h2>
                                <div className="flex items-center">
                                    <span className="text-xs text-muted-foreground mr-1">
                                        Sort by:
                                    </span>
                                    <div className="relative">
                                        <select
                                            className="appearance-none bg-transparent text-xs text-foreground pr-4 focus:outline-none cursor-pointer"
                                            value={sortOption}
                                            onChange={(e) => setSortOption(e.target.value)}
                                        >
                                            {SORT_OPTIONS.map((option) => (
                                                <option key={option.id} value={option.id}>
                                                    {option.name}
                                                </option>
                                            ))}
                                        </select>
                                        <Icons.ChevronDown className="absolute right-0 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
                                    </div>
                                </div>
                            </div>
                            <div className="divide-y divide-border">
                                {filteredApps.map((app) => (
                                    <AppCard key={app.id} app={app} />
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'installed' && (
                    <div className="p-3">
                        <div className="text-center py-8 text-muted-foreground">
                            No installed apps yet.
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default observer(AppsTab);

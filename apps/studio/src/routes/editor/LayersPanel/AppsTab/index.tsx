import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';
import { Input } from '@onlook/ui/input';
import { useTranslation } from 'react-i18next';
import { PANEL_DIMENSIONS } from '@/lib/constants/ui';
import FeaturedAppCard from './FeaturedAppCard';
import AppCard from './AppCard';
import DetailPanel from './DetailPanel';

// Define AppData interface
export interface AppData {
    id: string;
    name: string;
    description: string;
    icon: string;
}

// Sample data for app categories
const APP_CATEGORIES = [
    { id: 'payments', name: 'Payments' },
    { id: 'database', name: 'Database' },
    { id: 'marketing', name: 'Marketing' },
];

// Sample data for featured apps
const FEATURED_APPS: AppData[] = [
    {
        id: '1',
        name: 'Stripe',
        description:
            'The Stripe Model Context Protocol server allows you to integrate with Stripe APIs through function calling. This protocol supports various tools to interact with different Stripe services.',
        icon: '',
    },
    {
        id: '2',
        name: 'Stripe',
        description:
            'The Stripe Model Context Protocol server allows you to integrate with Stripe APIs through function calling. This protocol supports various tools to interact with different Stripe services.',
        icon: '',
    },
    {
        id: '3',
        name: 'MongoDB',
        description:
            'The Stripe Model Context Protocol server allows you to integrate with Stripe APIs through function calling. This protocol supports various tools to interact with different Stripe services.',
        icon: '',
    },
];

// Sample data for all apps
const ALL_APPS: AppData[] = [
    {
        id: '1',
        name: 'Stripe',
        description:
            'The Stripe Model Context Protocol server allows you to integrate with Stripe APIs through function calling. This protocol supports various tools to interact with different Stripe services.',
        icon: '',
    },
    {
        id: '2',
        name: 'Stripe',
        description:
            'The Stripe Model Context Protocol server allows you to integrate with Stripe APIs through function calling. This protocol supports various tools to interact with different Stripe services.',
        icon: '',
    },
    {
        id: '3',
        name: 'Stripe',
        description:
            'The Stripe Model Context Protocol server allows you to integrate with Stripe APIs through function calling. This protocol supports various tools to interact with different Stripe services.',
        icon: '',
    },
    {
        id: '4',
        name: 'Stripe',
        description:
            'The Stripe Model Context Protocol server allows you to integrate with Stripe APIs through function calling. This protocol supports various tools to interact with different Stripe services.',
        icon: '',
    },
    {
        id: '5',
        name: 'Stripe',
        description:
            'The Stripe Model Context Protocol server allows you to integrate with Stripe APIs through function calling. This protocol supports various tools to interact with different Stripe services.',
        icon: '',
    },
    {
        id: '6',
        name: 'Stripe',
        description:
            'The Stripe Model Context Protocol server allows you to integrate with Stripe APIs through function calling. This protocol supports various tools to interact with different Stripe services.',
        icon: '',
    },
];

// Sort options
const SORT_OPTIONS = [
    { id: 'newest', name: 'Newest' },
    { id: 'popular', name: 'Popular' },
    { id: 'alphabetical', name: 'A-Z' },
];

interface AppsTabProps {
    onSelectApp?: (app: AppData | null) => void;
}

const AppsTab = observer(({ onSelectApp }: AppsTabProps) => {
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'browse' | 'installed'>('browse');
    const [sortOption, setSortOption] = useState('newest');
    const [selectedApp, setSelectedApp] = useState<AppData | null>(null);

    // Filter apps based on search query
    const filteredApps = ALL_APPS.filter((app) => {
        return (
            app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            app.description.toLowerCase().includes(searchQuery.toLowerCase())
        );
    });

    const handleAppClick = (app: AppData) => {
        console.log('App clicked:', app.name);
        setSelectedApp(app);
        if (onSelectApp) {
            onSelectApp(app);
        }
    };

    const handleCloseDetailPanel = () => {
        console.log('Closing detail panel');
        setSelectedApp(null);
        if (onSelectApp) {
            onSelectApp(null);
        }
    };

    return (
        <div className="w-full h-full flex flex-row text-xs text-active">
            {/* Main Apps Panel */}
            <div
                className={`${PANEL_DIMENSIONS.LAYERS_PANEL.WIDTH} h-full flex flex-col overflow-hidden`}
            >
                {/* Search Bar */}
                <div className="px-4 py-4 border-b border-border border-b-[0.5px]">
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
                <div className="flex px-4 border-b border-border border-b-[0.5px] top-0 z-10">
                    <button
                        className={cn(
                            'flex-1 py-3 text-sm font-normal',
                            activeTab === 'browse'
                                ? 'text-foreground border-b border-foreground border-b-[0.5px]'
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
                                ? 'text-foreground border-b border-foreground border-b-[0.5px]'
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
                                        className="px-3 py-1.5 text-sm font-normal rounded-lg text-muted-foreground whitespace-nowrap border-border border border-[0.5px] bg-transparent"
                                    >
                                        {category.name}
                                    </button>
                                ))}
                            </div>

                            {/* Featured Apps */}
                            <div className="pt-1 pb-6 border-b border-border border-b-[0.5px]">
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
                                            <FeaturedAppCard app={app} onClick={handleAppClick} />
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
                                <div className="divide-y divide-border divide-y-[0.5px]">
                                    {filteredApps.map((app) => (
                                        <AppCard key={app.id} app={app} onClick={handleAppClick} />
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

            {/* Detail Panel - Side Panel */}
            {selectedApp && (
                <div className="w-[450px] border-l border-border border-l-[0.5px]">
                    <DetailPanel onClose={handleCloseDetailPanel} app={selectedApp} />
                </div>
            )}
        </div>
    );
});

export default AppsTab;

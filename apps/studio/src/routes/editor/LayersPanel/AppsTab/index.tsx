import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import AppCard from './AppCard';
import DetailPanel from './DetailPanel';
import InstalledAppCard from './InstalledAppCard';

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

// Define AppData interface
export interface AppData {
    id: string;
    name: string;
    description: string;
    icon: string;
    hasError?: boolean;
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
        id: 'featured-stripe',
        name: 'Stripe',
        description:
            'Integrate payment processing, subscriptions, and financial services into your app. The Stripe MCP allows you to accept payments, manage customers, and handle complex billing scenarios.',
        icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/stripe.svg',
    },
    {
        id: 'featured-mongodb',
        name: 'MongoDB',
        description:
            'Connect to MongoDB databases to store, query, and manage your application data. This MCP integration enables document creation, complex queries, and database management without writing backend code.',
        icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/mongodb.svg',
    },
    {
        id: 'featured-figma',
        name: 'Figma',
        description:
            'Access Figma design files, components, and assets directly in your application. The Figma MCP lets you retrieve designs, export assets, and keep your app in sync with your design system.',
        icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/figma.svg',
    },
];

// Sample data for all apps
const ALL_APPS: AppData[] = [
    {
        id: 'all-github',
        name: 'GitHub',
        description:
            'Manage repositories, issues, and pull requests through the GitHub MCP. Automate workflows, track code changes, and integrate version control directly into your application.',
        icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/github.svg',
    },
    {
        id: 'all-slack',
        name: 'Slack',
        description:
            'Send messages, create channels, and manage workspaces with the Slack MCP. Build interactive notifications and collaborative features that connect your app with team communications.',
        icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/slack.svg',
    },
    {
        id: 'all-notion',
        name: 'Notion',
        description:
            'Create, read, and update Notion pages, databases, and content. The Notion MCP enables knowledge management and documentation features without leaving your application.',
        icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/notion.svg',
    },
    {
        id: 'all-salesforce',
        name: 'Salesforce',
        description:
            'Access customer data, manage leads, and automate sales processes with the Salesforce MCP. Connect your app to the leading CRM platform to enhance customer relationship management.',
        icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/salesforce.svg',
    },
    {
        id: 'all-airtable',
        name: 'Airtable',
        description:
            'Interact with Airtable bases to create flexible databases and spreadsheets. The Airtable MCP allows you to build, query, and visualize structured data without complex database setup.',
        icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/airtable.svg',
    },
    {
        id: 'all-twilio',
        name: 'Twilio',
        description:
            'Send SMS, make calls, and manage communication channels through the Twilio MCP. Add powerful messaging and voice capabilities to your application with minimal configuration.',
        icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/twilio.svg',
    },
];

// Sample data for installed apps
const INSTALLED_APPS: AppData[] = [
    {
        id: 'installed-stripe',
        name: 'Stripe',
        description:
            'Interact with the Stripe API. This server supports various tools to interact with different Stripe services.',
        icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/stripe.svg',
        hasError: false,
    },
    {
        id: 'installed-github',
        name: 'GitHub',
        description:
            'Manage repositories, issues, and pull requests through the GitHub MCP. Automate workflows and track code changes.',
        icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/github.svg',
    },
    {
        id: 'installed-salesforce',
        name: 'Salesforce',
        description:
            'Access customer data, manage leads, and automate sales processes with the Salesforce MCP. Connect your app to the leading CRM platform.',
        icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/salesforce.svg',
        hasError: true,
    },
    {
        id: 'installed-mongodb',
        name: 'MongoDB',
        description:
            'Connect to MongoDB databases to store, query, and manage your application data. Enable document creation and complex queries.',
        icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/mongodb.svg',
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
    const [selectedAppListId, setSelectedAppListId] = useState<string | null>(null);

    // Add state for tracking hover
    const [hoveredAppId, setHoveredAppId] = useState<string | null>(null);
    const [hoveredListId, setHoveredListId] = useState<string | null>(null);

    // Filter apps based on search query
    const filteredApps = ALL_APPS.filter((app) => {
        return (
            app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            app.description.toLowerCase().includes(searchQuery.toLowerCase())
        );
    });

    const handleAppClick = (app: AppData, listId: string) => {
        console.log('App clicked:', app.name);
        setSelectedApp(app);
        setSelectedAppListId(listId);
        if (onSelectApp) {
            onSelectApp(app);
        }
    };

    const handleCloseDetailPanel = () => {
        console.log('Closing detail panel');
        setSelectedApp(null);
        setSelectedAppListId(null);
        if (onSelectApp) {
            onSelectApp(null);
        }
    };

    // Add handlers for mouse enter/leave
    const handleAppMouseEnter = (app: AppData, listId: string) => {
        setHoveredAppId(app.id);
        setHoveredListId(listId);
    };

    const handleAppMouseLeave = () => {
        setHoveredAppId(null);
        setHoveredListId(null);
    };

    return (
        <div className="w-full h-full flex flex-row text-xs text-active">
            {/* Main Apps Panel */}
            <div className="h-full flex flex-col overflow-hidden">
                {/* Search Bar */}
                <div className="px-4 py-4 border-border border-b-[0.5px]">
                    <div className="relative">
                        <Icons.MagnifyingGlass className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search apps..."
                            className="h-9 rounded-md text-xs pl-7 pr-8"
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
                            <div className="relative">
                                <div className="flex p-4 pb-0 space-x-1.5 overflow-x-auto">
                                    {APP_CATEGORIES.map((category) => (
                                        <button
                                            key={category.id}
                                            className="px-3 py-1.5 text-sm font-normal rounded-lg text-muted-foreground whitespace-nowrap border-border border border-[0.5px] bg-transparent"
                                        >
                                            {category.name}
                                        </button>
                                    ))}
                                </div>
                                {/* Gradient overlay for scroll fade effect */}
                                <div className="absolute right-0 top-0 bottom-0 w-16 pointer-events-none bg-gradient-to-l from-background to-transparent"></div>
                            </div>

                            {/* Featured Apps - Only show when not searching */}
                            {!searchQuery && (
                                <div className="pt-6 pb-6 border-b border-border border-b-[0.5px]">
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
                                    <div className="relative">
                                        <div className="flex px-4 overflow-x-auto">
                                            {FEATURED_APPS.map((app) => (
                                                <AppCard
                                                    key={app.id}
                                                    app={app}
                                                    onClick={(app) =>
                                                        handleAppClick(app, 'featured')
                                                    }
                                                    isActive={selectedApp?.id === app.id}
                                                    anyAppActive={
                                                        !!selectedApp &&
                                                        selectedAppListId === 'featured'
                                                    }
                                                    isHovered={hoveredAppId === app.id}
                                                    anyCardHovered={
                                                        !!hoveredAppId &&
                                                        hoveredListId === 'featured'
                                                    }
                                                    onMouseEnter={() =>
                                                        handleAppMouseEnter(app, 'featured')
                                                    }
                                                    onMouseLeave={handleAppMouseLeave}
                                                    listId="featured"
                                                    hideDivider={true}
                                                    className="flex-shrink-0 max-w-[225px] min-w-[225px] p-3 border border-border border-[0.5px] rounded-lg mr-1.5"
                                                />
                                            ))}
                                        </div>
                                        {/* Gradient overlay for scroll fade effect */}
                                        <div className="absolute right-0 top-0 bottom-0 w-16 pointer-events-none bg-gradient-to-l from-background to-transparent"></div>
                                    </div>
                                </div>
                            )}

                            {/* All Apps */}
                            <div className={`pt-6 pb-4 w-full ${!searchQuery ? '' : 'pt-1'}`}>
                                <div className="flex items-center justify-between px-4 mb-1 w-full">
                                    <h2 className="text-sm font-normal text-muted-foreground">
                                        All apps
                                    </h2>
                                    <div className="flex items-center">
                                        <span className="text-sm text-muted-foreground mr-1">
                                            Sort by:
                                        </span>
                                        <div className="relative">
                                            <select
                                                className="appearance-none bg-transparent text-sm text-foreground pr-4 focus:outline-none cursor-pointer"
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
                                <div className="flex flex-col items-stretch w-full">
                                    {filteredApps.map((app, index) => (
                                        <AppCard
                                            key={app.id}
                                            app={app}
                                            onClick={(app) => handleAppClick(app, 'all')}
                                            isActive={selectedApp?.id === app.id}
                                            anyAppActive={
                                                !!selectedApp && selectedAppListId === 'all'
                                            }
                                            isHovered={hoveredAppId === app.id}
                                            anyCardHovered={
                                                !!hoveredAppId && hoveredListId === 'all'
                                            }
                                            onMouseEnter={() => handleAppMouseEnter(app, 'all')}
                                            onMouseLeave={handleAppMouseLeave}
                                            listId="all"
                                            className="py-4 px-4 rounded-none"
                                            hideDivider={
                                                index === filteredApps.length - 1 ||
                                                selectedApp?.id === app.id
                                            }
                                        />
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === 'installed' && (
                        <div className="p-4">
                            {INSTALLED_APPS.length > 0 ? (
                                <div className="space-y-4">
                                    {INSTALLED_APPS.map((app, index) => (
                                        <InstalledAppCard
                                            key={app.id}
                                            app={app}
                                            onClick={(app) => handleAppClick(app, 'installed')}
                                            isActive={selectedApp?.id === app.id}
                                            anyAppActive={
                                                !!selectedApp && selectedAppListId === 'installed'
                                            }
                                            isHovered={hoveredAppId === app.id}
                                            anyCardHovered={
                                                !!hoveredAppId && hoveredListId === 'installed'
                                            }
                                            onMouseEnter={() =>
                                                handleAppMouseEnter(app, 'installed')
                                            }
                                            onMouseLeave={handleAppMouseLeave}
                                            listId="installed"
                                            hideDivider={
                                                index === INSTALLED_APPS.length - 1 ||
                                                selectedApp?.id === app.id
                                            }
                                            hasError={app.hasError}
                                            onToggle={(app, enabled) => {
                                                console.log(
                                                    `App ${app.name} toggled: ${enabled ? 'enabled' : 'disabled'}`,
                                                );
                                                // Here you would handle the toggle state change
                                            }}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    No installed apps yet.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Detail Panel - Side Panel */}
            {selectedApp && (
                <div className="w-[500px] border-l border-border border-l-[0.5px]">
                    <DetailPanel onClose={handleCloseDetailPanel} app={selectedApp} />
                </div>
            )}
        </div>
    );
});

export default AppsTab;

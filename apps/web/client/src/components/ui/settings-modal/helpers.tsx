export enum SettingsTabValue {
    DOMAIN = 'domain',
    PROJECT = 'project',
    PREFERENCES = 'account',
    SUBSCRIPTION = 'subscription',
    VERSIONS = 'versions',
    ADVANCED = 'advanced',
    SITE = 'site',
}

export interface SettingTab {
    label: SettingsTabValue | string;
    icon: React.ReactNode;
    component: React.ReactNode;
}

export const ComingSoonTab = () => {
    return <div>Coming soon...</div>;
};

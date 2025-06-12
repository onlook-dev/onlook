import { MotionConfig } from 'motion/react';

import { CardDescription } from '@onlook/ui/card';
import { CardTitle } from '@onlook/ui/card';
import { AnimatePresence } from 'motion/react';

import { Button } from '@onlook/ui/button';
import { motion } from 'motion/react';
import { Icons } from '@onlook/ui/icons';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@onlook/ui/select';
import type { StepComponent } from '../with-step-props';
import { useEffect, useState } from 'react';
import { useImportGithubProject } from './context';

const SetupGithub: StepComponent = ({
    variant,
}: {
    variant: 'header' | 'content' | 'footer';
}) => {
    const { prevStep, nextStep, organizations, selectedOrg, setSelectedOrg, isLoadingOrganizations, repositories, selectedRepo, setSelectedRepo, isLoadingRepositories } = useImportGithubProject();

    const handleOrganizationSelect = (value: string) => {
        const organization = organizations.find(org => org.login === value);
        setSelectedOrg(organization || null);
        // Clear selected repo when organization changes
        setSelectedRepo(null);
    };

    const handleRepositorySelect = (value: string) => {
        const repository = filteredRepositories.find(repo => repo.name === value);
        setSelectedRepo(repository || null);
    };

    // Filter repositories based on selected organization
    const filteredRepositories = selectedOrg 
        ? repositories.filter(repo => repo.owner.login === selectedOrg.login)
        : repositories;

    const renderHeader = () => {
        return (
            <>
                <CardTitle>{'Setup your project'}</CardTitle>
                <CardDescription>{'Select which repo you want to import'}</CardDescription>
            </>
        );
    };

    const renderContent = () => (
        <MotionConfig transition={{ duration: 0.5, type: 'spring', bounce: 0 }}>
            <AnimatePresence mode="popLayout">
                <motion.div
                    key="name"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="w-full gap-6 flex flex-col"
                >
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-foreground-primary">
                            Organization
                        </label>
                        <Select value={selectedOrg?.login || ""} onValueChange={handleOrganizationSelect} disabled={isLoadingOrganizations}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select organization" />
                            </SelectTrigger>
                            <SelectContent>
                                {organizations.map((org) => (
                                    <SelectItem key={org.id} value={org.login}>
                                        <div className="flex items-center gap-2">
                                            <img 
                                                src={org.avatar_url} 
                                                alt={org.login} 
                                                className="w-4 h-4 rounded-full"
                                            />
                                            <span>{org.login}</span>
                                            {org.description && (
                                                <span className="text-xs text-foreground-secondary ml-1">
                                                    - {org.description}
                                                </span>
                                            )}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {isLoadingOrganizations && (
                            <div className="flex items-center gap-2 text-sm text-foreground-secondary">
                                <Icons.Shadow className="w-3 h-3 animate-spin" />
                                Loading organizations...
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-foreground-primary">
                            Repository
                        </label>
                        <Select 
                            value={selectedRepo?.name || ""} 
                            onValueChange={handleRepositorySelect} 
                            disabled={isLoadingRepositories || !selectedOrg}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Find a NextJS repository" />
                            </SelectTrigger>
                            <SelectContent>
                                {filteredRepositories.map((repo) => (
                                    <SelectItem key={repo.id} value={repo.name}>
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center gap-1">
                                                {repo.private ? (
                                                    <Icons.LockClosed className="w-3 h-3 text-foreground-secondary" />
                                                ) : (
                                                    <Icons.Globe className="w-3 h-3 text-foreground-secondary" />
                                                )}
                                                <span>{repo.name}</span>
                                            </div>
                                            {repo.description && (
                                                <span className="text-xs text-foreground-secondary ml-1">
                                                    - {repo.description}
                                                </span>
                                            )}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {isLoadingRepositories && (
                            <div className="flex items-center gap-2 text-sm text-foreground-secondary">
                                <Icons.Shadow className="w-3 h-3 animate-spin" />
                                Loading repositories...
                            </div>
                        )}
                        {selectedOrg && filteredRepositories.length === 0 && !isLoadingRepositories && (
                            <div className="text-sm text-foreground-secondary">
                                No repositories found for {selectedOrg.login}
                            </div>
                        )}
                    </div>
                </motion.div>
            </AnimatePresence>
        </MotionConfig>
    );
    const renderFooter = () => {
        return (
            <div className="flex flex-row w-full justify-between">
                <Button onClick={prevStep} variant="outline">
                    Cancel
                </Button>
                <Button className='px-3 py-2' onClick={nextStep}>
                    <Icons.Download className="w-4 h-4 mr-2" />
                    <span>Import</span>
                </Button>
            </div>
        );
    };
    switch (variant) {
        case 'header':
            return renderHeader();
        case 'content':
            return renderContent();
        case 'footer':
            return renderFooter();
    }
};

SetupGithub.Header = () => <SetupGithub variant="header" />;
SetupGithub.Content = () => <SetupGithub variant="content" />;
SetupGithub.Footer = () => <SetupGithub variant="footer" />;

SetupGithub.Header.displayName = 'SetupGithub.Header';
SetupGithub.Content.displayName = 'SetupGithub.Content';
SetupGithub.Footer.displayName = 'SetupGithub.Footer';

export { SetupGithub };

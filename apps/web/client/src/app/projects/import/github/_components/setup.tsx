import { MotionConfig } from 'motion/react';

import { CardDescription } from '@onlook/ui/card';
import { CardTitle } from '@onlook/ui/card';
import { AnimatePresence } from 'motion/react';

import { Button } from '@onlook/ui/button';
import { motion } from 'motion/react';
import { Icons } from '@onlook/ui/icons';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@onlook/ui/select';
import { useImportGithubProject } from '../_context/context';
import { StepContent, StepFooter, StepHeader } from '../../steps';

export const SetupGithub = () => {
    const {
        prevStep,
        organizations,
        selectedOrg,
        setSelectedOrg,
        importRepo,
        isLoadingOrganizations,
        repositories,
        selectedRepo,
        setSelectedRepo,
        isLoadingRepositories,
    } = useImportGithubProject();

    const handleOrganizationSelect = (value: string) => {
        const organization = organizations.find((org) => org.login === value);
        setSelectedOrg(organization || null);
        setSelectedRepo(null);
    };

    const handleRepositorySelect = (value: string) => {
        const repository = filteredRepositories.find((repo) => repo.name === value);
        setSelectedRepo(repository || null);
    };

    const filteredRepositories = selectedOrg
        ? repositories.filter((repo) => repo.owner.login === selectedOrg.login)
        : repositories;

    return (
        <>
            <StepHeader>
                <CardTitle>{'Setup your project'}</CardTitle>
                <CardDescription>{'Select which repo you want to import'}</CardDescription>
            </StepHeader>
            <StepContent>
                <motion.div
                    key="name"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="w-full"
                >
                    {' '}
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-foreground-primary">
                            Organization
                        </label>
                        <Select
                            value={selectedOrg?.login || ''}
                            onValueChange={handleOrganizationSelect}
                            disabled={isLoadingOrganizations}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select organization" />
                            </SelectTrigger>
                            <SelectContent className="max-w-[26rem]">
                                {organizations.map((org) => (
                                    <SelectItem key={org.id} value={org.login}>
                                        <div className="flex items-center gap-2 w-full">
                                            <img
                                                src={org.avatar_url}
                                                alt={org.login}
                                                className="w-4 h-4 rounded-full"
                                            />
                                            <span>{org.login}</span>
                                            {org.description && (
                                                <span className="text-xs text-foreground-secondary ml-1 truncate">
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
                            value={selectedRepo?.name || ''}
                            onValueChange={handleRepositorySelect}
                            disabled={isLoadingRepositories || !selectedOrg}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Find a NextJS repository" />
                            </SelectTrigger>
                            <SelectContent className="max-w-[27rem]">
                                {filteredRepositories.map((repo) => (
                                    <SelectItem key={repo.id} value={repo.name}>
                                        <div className="flex items-center gap-2 w-full">
                                            <div className="flex items-center gap-1">
                                                {repo.private ? (
                                                    <Icons.LockClosed className="w-3 h-3 text-foreground-secondary" />
                                                ) : (
                                                    <Icons.Globe className="w-3 h-3 text-foreground-secondary" />
                                                )}
                                                <span>{repo.name}</span>
                                            </div>
                                            {repo.description && (
                                                <span className="text-xs text-foreground-secondary ml-1 truncate max-w-[18rem]">
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
                        {selectedOrg &&
                            filteredRepositories.length === 0 &&
                            !isLoadingRepositories && (
                                <div className="text-sm text-foreground-secondary">
                                    No repositories found for {selectedOrg.login}
                                </div>
                            )}
                    </div>
                </motion.div>
            </StepContent>
            <StepFooter>
                <Button onClick={prevStep} variant="outline">
                    Cancel
                </Button>
                <Button className="px-3 py-2" onClick={importRepo} disabled={!selectedRepo}>
                    <Icons.Download className="w-4 h-4 mr-2" />
                    <span>Import</span>
                </Button>
            </StepFooter>
        </>
    );
};

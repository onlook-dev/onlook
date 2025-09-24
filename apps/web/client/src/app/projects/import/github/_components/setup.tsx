import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';

import { Button } from '@onlook/ui/button';
import { Card, CardContent, CardDescription, CardTitle } from '@onlook/ui/card';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@onlook/ui/select';

import { useImportGithubProject } from '../_context';
import { StepContent, StepFooter, StepHeader } from '../../steps';

export const SetupGithub = () => {
    const {
        prevStep,
        selectedOrg,
        setSelectedOrg,
        nextStep,
        selectedRepo,
        setSelectedRepo,
        githubData,
        repositoryImport,
        installation,
    } = useImportGithubProject();

    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);
    const [canScrollUp, setCanScrollUp] = useState(false);
    const [canScrollDown, setCanScrollDown] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const searchContainerRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const handleOrganizationSelect = (value: string) => {
        if (value === 'all') {
            setSelectedOrg(null);
        } else {
            const organization = githubData.organizations.find((org: any) => org.login === value);
            setSelectedOrg(organization || null);
        }
        setSelectedRepo(null);
    };

    const handleRepositorySelect = (value: string) => {
        const repository = githubData.repositories.find((repo: any) => repo.full_name === value);
        setSelectedRepo(repository || null);
    };

    // Handle search toggle
    const handleSearchToggle = () => {
        if (isSearchExpanded) {
            setSearchQuery('');
            setIsSearchExpanded(false);
        } else {
            setIsSearchExpanded(true);
            setTimeout(() => searchInputRef.current?.focus(), 100);
        }
    };

    // Filter repositories by organization and search query
    const filteredRepositories = githubData.repositories.filter((repo: any) => {
        const matchesOrg = selectedOrg ? repo.owner.login === selectedOrg.login : true;
        const matchesSearch =
            searchQuery.trim() === '' ||
            repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            repo.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            repo.description?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesOrg && matchesSearch;
    });

    const updateScrollIndicators = useCallback(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const { scrollTop, scrollHeight, clientHeight } = container;
        setCanScrollUp(scrollTop > 0);
        setCanScrollDown(scrollTop + clientHeight < scrollHeight);
    }, []);

    useEffect(() => {
        updateScrollIndicators();
    }, [filteredRepositories, updateScrollIndicators]);

    // Handle click outside to close search
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                searchContainerRef.current &&
                !searchContainerRef.current.contains(event.target as Node)
            ) {
                if (searchQuery === '') {
                    setIsSearchExpanded(false);
                }
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [searchQuery]);

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
                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col gap-2">
                            <label className="text-foreground-primary text-sm font-medium">
                                Organization (Optional)
                            </label>
                            <Select
                                value={selectedOrg?.login || 'all'}
                                onValueChange={handleOrganizationSelect}
                                disabled={githubData.isLoadingOrganizations}
                            >
                                <SelectTrigger className="w-full max-w-sm">
                                    <SelectValue placeholder="All repositories" />
                                </SelectTrigger>
                                <SelectContent className="max-w-sm">
                                    <SelectItem value="all">
                                        <div className="flex w-full items-center gap-2">
                                            <Icons.Globe className="h-4 w-4" />
                                            <span>All repositories</span>
                                        </div>
                                    </SelectItem>
                                    {githubData.organizations.map((org: any) => (
                                        <SelectItem key={org.id} value={org.login}>
                                            <div className="flex w-full items-center gap-2">
                                                <img
                                                    src={org.avatar_url}
                                                    alt={org.login}
                                                    className="h-4 w-4 rounded-full"
                                                />
                                                <span>{org.login}</span>
                                                {org.description && (
                                                    <span className="text-foreground-secondary ml-1 truncate text-xs">
                                                        - {org.description}
                                                    </span>
                                                )}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {githubData.isLoadingOrganizations && (
                                <div className="text-foreground-secondary flex items-center gap-2 text-sm">
                                    <Icons.Shadow className="h-3 w-3 animate-spin" />
                                    Loading organizations...
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                                <label className="text-foreground-primary text-sm font-medium">
                                    Repository
                                </label>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            githubData.fetchOrganizations();
                                            githubData.fetchRepositories();
                                        }}
                                        disabled={
                                            githubData.isLoadingRepositories ||
                                            githubData.isLoadingOrganizations
                                        }
                                        className="bg-background hover:bg-secondary flex h-8 w-8 items-center justify-center rounded border transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                                        title="Refresh repositories"
                                    >
                                        <Icons.Reload
                                            className={`text-foreground-tertiary h-4 w-4 ${githubData.isLoadingRepositories || githubData.isLoadingOrganizations ? 'animate-spin' : ''}`}
                                        />
                                    </button>
                                    <motion.div
                                        ref={searchContainerRef}
                                        className="relative"
                                        initial={false}
                                        animate={isSearchExpanded ? { width: 240 } : { width: 32 }}
                                        transition={{
                                            duration: 0.2,
                                            ease: [0.25, 0.46, 0.45, 0.94],
                                        }}
                                    >
                                        {!isSearchExpanded ? (
                                            <button
                                                onClick={handleSearchToggle}
                                                className="bg-background hover:bg-secondary flex h-8 w-8 items-center justify-center rounded border transition-colors"
                                            >
                                                <Icons.MagnifyingGlass className="text-foreground-tertiary h-4 w-4" />
                                            </button>
                                        ) : (
                                            <>
                                                <Icons.MagnifyingGlass className="text-foreground-tertiary absolute top-1/2 left-3 z-10 h-4 w-4 -translate-y-1/2" />
                                                <Input
                                                    ref={searchInputRef}
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    placeholder="Search repositories"
                                                    className="h-8 pr-7 pl-9 text-sm focus-visible:border-transparent focus-visible:ring-0"
                                                />
                                                {searchQuery && (
                                                    <button
                                                        onClick={() => setSearchQuery('')}
                                                        className="text-foreground-tertiary hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2"
                                                    >
                                                        <Icons.CrossS className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </motion.div>
                                </div>
                            </div>

                            <Card className="relative h-64">
                                <CardContent className="h-full p-0">
                                    {canScrollUp && (
                                        <div className="from-background via-background/80 absolute top-0 right-0 left-0 z-10 flex h-6 items-start justify-center bg-gradient-to-b to-transparent pt-1">
                                            <Icons.ChevronUp className="text-foreground-secondary h-4 w-4" />
                                        </div>
                                    )}

                                    {canScrollDown && (
                                        <div className="from-background via-background/80 absolute right-0 bottom-0 left-0 z-10 flex h-6 items-end justify-center bg-gradient-to-t to-transparent pb-1">
                                            <Icons.ChevronDown className="text-foreground-secondary h-4 w-4" />
                                        </div>
                                    )}

                                    {githubData.isLoadingRepositories ? (
                                        <div className="text-foreground-secondary flex h-full items-center justify-center gap-2 text-sm">
                                            <Icons.Shadow className="h-3 w-3 animate-spin" />
                                            Loading repositories...
                                        </div>
                                    ) : filteredRepositories.length === 0 ? (
                                        <div className="text-foreground-secondary flex h-full items-center justify-center text-sm">
                                            {searchQuery
                                                ? 'No repositories match your search'
                                                : selectedOrg
                                                  ? `No repositories found for ${selectedOrg.login}`
                                                  : 'No repositories found'}
                                        </div>
                                    ) : (
                                        <div
                                            ref={scrollContainerRef}
                                            className="h-full overflow-y-auto"
                                            onScroll={updateScrollIndicators}
                                        >
                                            {filteredRepositories.map((repo: any) => (
                                                <button
                                                    key={repo.id}
                                                    onClick={() =>
                                                        handleRepositorySelect(repo.full_name)
                                                    }
                                                    className={`hover:bg-secondary w-full border-b p-3 text-left transition-colors last:border-b-0 ${
                                                        selectedRepo?.id === repo.id
                                                            ? 'bg-secondary'
                                                            : ''
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex items-center gap-1">
                                                            {repo.private ? (
                                                                <Icons.LockClosed className="text-foreground-secondary h-3 w-3" />
                                                            ) : (
                                                                <Icons.Globe className="text-foreground-secondary h-3 w-3" />
                                                            )}
                                                            <span className="text-sm font-medium">
                                                                {repo.owner.login}
                                                            </span>
                                                            <span className="text-foreground-secondary">
                                                                /
                                                            </span>
                                                            <span className="text-sm">
                                                                {repo.name}
                                                            </span>
                                                        </div>
                                                        {selectedRepo?.id === repo.id && (
                                                            <Icons.Check className="ml-auto h-4 w-4 text-green-500" />
                                                        )}
                                                    </div>
                                                    {repo.description && (
                                                        <p className="text-foreground-secondary mt-1 truncate text-xs">
                                                            {repo.description}
                                                        </p>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {selectedRepo && (
                                <div className="text-foreground-secondary text-sm">
                                    Selected:{' '}
                                    <span className="font-medium">{selectedRepo.full_name}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            </StepContent>
            <StepFooter>
                <Button onClick={prevStep} variant="outline">
                    Cancel
                </Button>
                <div className="flex gap-2">
                    <Button onClick={() => installation.redirectToInstallation()} variant="outline">
                        <Icons.Gear className="mr-2 h-4 w-4" />
                        Configure
                    </Button>
                    <Button
                        className="px-3 py-2"
                        onClick={nextStep}
                        disabled={!selectedRepo || repositoryImport.isImporting}
                    >
                        <Icons.Download className="mr-2 h-4 w-4" />
                        <span>Import</span>
                    </Button>
                </div>
            </StepFooter>
        </>
    );
};

import { Button } from '@onlook/ui/button';
import { Card, CardContent, CardDescription, CardTitle } from '@onlook/ui/card';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@onlook/ui/select';
import { motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StepContent, StepFooter, StepHeader } from '../../steps';
import { useImportGithubProject } from '../_context';

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
        const matchesSearch = searchQuery.trim() === '' ||
            repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            repo.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (repo.description && repo.description.toLowerCase().includes(searchQuery.toLowerCase()));
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
                            <label className="text-sm font-medium text-foreground-primary">
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
                                        <div className="flex items-center gap-2 w-full">
                                            <Icons.Globe className="w-4 h-4" />
                                            <span>All repositories</span>
                                        </div>
                                    </SelectItem>
                                    {githubData.organizations.map((org: any) => (
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
                            {githubData.isLoadingOrganizations && (
                                <div className="flex items-center gap-2 text-sm text-foreground-secondary">
                                    <Icons.Shadow className="w-3 h-3 animate-spin" />
                                    Loading organizations...
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-foreground-primary">
                                    Repository
                                </label>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            githubData.fetchOrganizations();
                                            githubData.fetchRepositories();
                                        }}
                                        disabled={githubData.isLoadingRepositories || githubData.isLoadingOrganizations}
                                        className="w-8 h-8 rounded border bg-background hover:bg-secondary transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Refresh repositories"
                                    >
                                        <Icons.Reload className={`h-4 w-4 text-foreground-tertiary ${(githubData.isLoadingRepositories || githubData.isLoadingOrganizations) ? 'animate-spin' : ''}`} />
                                    </button>
                                    <motion.div
                                        ref={searchContainerRef}
                                        className="relative"
                                        initial={false}
                                        animate={isSearchExpanded ? { width: 240 } : { width: 32 }}
                                        transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                                    >
                                        {!isSearchExpanded ? (
                                            <button
                                                onClick={handleSearchToggle}
                                                className="w-8 h-8 rounded border bg-background hover:bg-secondary transition-colors flex items-center justify-center"
                                            >
                                                <Icons.MagnifyingGlass className="h-4 w-4 text-foreground-tertiary" />
                                            </button>
                                        ) : (
                                            <>
                                                <Icons.MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-tertiary z-10" />
                                                <Input
                                                    ref={searchInputRef}
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    placeholder="Search repositories"
                                                    className="pl-9 pr-7 text-sm h-8 focus-visible:border-transparent focus-visible:ring-0"
                                                />
                                                {searchQuery && (
                                                    <button
                                                        onClick={() => setSearchQuery('')}
                                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-foreground-tertiary hover:text-foreground"
                                                    >
                                                        <Icons.CrossS className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </motion.div>
                                </div>
                            </div>

                            <Card className="h-64 relative">
                                <CardContent className="p-0 h-full">
                                    {canScrollUp && (
                                        <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-background via-background/80 to-transparent z-10 flex items-start justify-center pt-1">
                                            <Icons.ChevronUp className="w-4 h-4 text-foreground-secondary" />
                                        </div>
                                    )}

                                    {canScrollDown && (
                                        <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-background via-background/80 to-transparent z-10 flex items-end justify-center pb-1">
                                            <Icons.ChevronDown className="w-4 h-4 text-foreground-secondary" />
                                        </div>
                                    )}

                                    {githubData.isLoadingRepositories ? (
                                        <div className="flex items-center justify-center gap-2 h-full text-sm text-foreground-secondary">
                                            <Icons.Shadow className="w-3 h-3 animate-spin" />
                                            Loading repositories...
                                        </div>
                                    ) : filteredRepositories.length === 0 ? (
                                        <div className="flex items-center justify-center h-full text-sm text-foreground-secondary">
                                            {searchQuery ? 'No repositories match your search' :
                                                selectedOrg ? `No repositories found for ${selectedOrg.login}` :
                                                    'No repositories found'}
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
                                                    onClick={() => handleRepositorySelect(repo.full_name)}
                                                    className={`w-full text-left p-3 border-b last:border-b-0 hover:bg-secondary transition-colors ${selectedRepo?.id === repo.id ? 'bg-secondary' : ''
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex items-center gap-1">
                                                            {repo.private ? (
                                                                <Icons.LockClosed className="w-3 h-3 text-foreground-secondary" />
                                                            ) : (
                                                                <Icons.Globe className="w-3 h-3 text-foreground-secondary" />
                                                            )}
                                                            <span className="font-medium text-sm">{repo.owner.login}</span>
                                                            <span className="text-foreground-secondary">/</span>
                                                            <span className="text-sm">{repo.name}</span>
                                                        </div>
                                                        {selectedRepo?.id === repo.id && (
                                                            <Icons.Check className="w-4 h-4 text-green-500 ml-auto" />
                                                        )}
                                                    </div>
                                                    {repo.description && (
                                                        <p className="text-xs text-foreground-secondary mt-1 truncate">
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
                                <div className="text-sm text-foreground-secondary">
                                    Selected: <span className="font-medium">{selectedRepo.full_name}</span>
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
                        <Icons.Gear className="w-4 h-4 mr-2" />
                        Configure
                    </Button>
                    <Button className="px-3 py-2" onClick={nextStep} disabled={!selectedRepo || repositoryImport.isImporting}>
                        <Icons.Download className="w-4 h-4 mr-2" />
                        <span>Import</span>
                    </Button>
                </div>
            </StepFooter >
        </>
    );
};

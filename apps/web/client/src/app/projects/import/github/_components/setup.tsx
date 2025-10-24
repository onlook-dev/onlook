import { Button } from '@onlook/ui/button';
import { Card, CardContent, CardDescription, CardTitle } from '@onlook/ui/card';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@onlook/ui/select';
import { motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, type RouterOutputs } from '@/trpc/react';
import { Routes } from '@/utils/constants';
import { useRouter } from 'next/navigation';
import { StepContent, StepFooter, StepHeader } from '../../steps';

type GitHubData = RouterOutputs['github']['getRepositoriesWithOAuth'];
type GitHubRepository = GitHubData['repos'][number];
type GitHubOrganization = GitHubData['organizations'][number];

export const SetupGithub = () => {
    const router = useRouter();
    const [selectedOrg, setSelectedOrg] = useState<GitHubOrganization | null>(null);
    const [selectedRepo, setSelectedRepo] = useState<GitHubRepository | null>(null);
    const [importError, setImportError] = useState<string | null>(null);
    const [isValidating, setIsValidating] = useState(false);

    // Use tRPC hook for data fetching - organizations are derived from repos
    const { data, isLoading: isLoadingRepositories, refetch: refetchRepositories } =
        api.github.getRepositoriesWithOAuth.useQuery();

    const repositories = data?.repos ?? [];
    const organizations = data?.organizations ?? [];

    const validateRepo = api.github.validateWithOAuth.useMutation();

    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);
    const [canScrollUp, setCanScrollUp] = useState(false);
    const [canScrollDown, setCanScrollDown] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const searchContainerRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const handleOrganizationSelect = (value: string) => {
        const organization = organizations.find((org: any) => org.login === value);
        setSelectedOrg(organization || null);
        setSelectedRepo(null);
    };

    const handleRepositorySelect = (value: string) => {
        const repository = repositories.find((repo: any) => repo.full_name === value);
        setSelectedRepo(repository || null);
        setImportError(null); // Clear any previous errors
    };

    const handleImport = async () => {
        if (!selectedRepo) return;

        setIsValidating(true);
        setImportError(null);

        try {
            const [owner, repo] = selectedRepo.full_name.split('/');
            if (!owner || !repo) {
                throw new Error('Invalid repository name');
            }

            // Validate repository access
            await validateRepo.mutateAsync({ owner, repo });

            // If validation succeeds, navigate to importing page
            const params = new URLSearchParams({
                repo: selectedRepo.full_name,
                branch: selectedRepo.default_branch,
                clone_url: selectedRepo.clone_url,
                name: selectedRepo.name,
                ...(selectedRepo.description && { description: selectedRepo.description }),
            });
            router.push(`${Routes.IMPORT_GITHUB}/importing?${params.toString()}`);
        } catch (error) {
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : 'Failed to validate repository access';
            setImportError(errorMessage);
        } finally {
            setIsValidating(false);
        }
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
    const filteredRepositories = repositories.filter((repo: any) => {
        const matchesOrg = !selectedOrg || repo.owner.login === selectedOrg.login;
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

    // Default to first organization when organizations load
    useEffect(() => {
        if (organizations.length > 0 && !selectedOrg && organizations[0]) {
            setSelectedOrg(organizations[0]);
        }
    }, [organizations, selectedOrg]);

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
                                Organization
                            </label>
                            <Select
                                value={selectedOrg?.login}
                                onValueChange={handleOrganizationSelect}
                                disabled={isLoadingRepositories}
                            >
                                <SelectTrigger className="w-full max-w-sm">
                                    <SelectValue placeholder="Select organization" />
                                </SelectTrigger>
                                <SelectContent className="max-w-sm">
                                    {organizations.map((org: any) => (
                                        <SelectItem key={org.id} value={org.login}>
                                            <div className="flex items-center gap-2 w-full">
                                                <img
                                                    src={org.avatar_url}
                                                    alt={org.login}
                                                    className="w-4 h-4 rounded-full"
                                                />
                                                <span>{org.login}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-foreground-primary">
                                    Repository
                                </label>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            void refetchRepositories();
                                        }}
                                        disabled={isLoadingRepositories}
                                        className="w-8 h-8 rounded border bg-background hover:bg-secondary transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Refresh repositories"
                                    >
                                        <Icons.Reload className={`h-4 w-4 text-foreground-tertiary ${isLoadingRepositories ? 'animate-spin' : ''}`} />
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

                            <Card className="h-64 relative rounded-t-none">
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

                                    {isLoadingRepositories ? (
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
                <Button onClick={() => router.push(Routes.IMPORT_PROJECT)} variant="outline">
                    Cancel
                </Button>
                <Button
                    className="px-3 py-2"
                    onClick={() => {
                        if (!selectedRepo) return;
                        const params = new URLSearchParams({
                            repo: selectedRepo.full_name,
                            branch: selectedRepo.default_branch,
                            clone_url: selectedRepo.clone_url,
                            name: selectedRepo.name,
                            ...(selectedRepo.description && { description: selectedRepo.description }),
                        });
                        router.push(`${Routes.IMPORT_GITHUB}/importing?${params.toString()}`);
                    }}
                    disabled={!selectedRepo}
                >
                    <Icons.Download className="w-4 h-4 mr-2" />
                    <span>Import</span>
                </Button>
            </StepFooter >
        </>
    );
};

import { useEditorEngine } from '@/components/store/editor';
import { api } from '@/trpc/react';
import { Button } from '@onlook/ui/button';
import { Checkbox } from '@onlook/ui/checkbox';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { Label } from '@onlook/ui/label';
import { Textarea } from '@onlook/ui/textarea';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';

interface CreateRepositoryStepProps {
    selectedOwner: string;
    onRepositoryCreated: (repo: any) => void;
    onBack: () => void;
}

export const CreateRepositoryStep = observer(({ 
    selectedOwner, 
    onRepositoryCreated, 
    onBack 
}: CreateRepositoryStepProps) => {
    const editorEngine = useEditorEngine();
    const { data: currentProject } = api.project.get.useQuery({ projectId: editorEngine.projectId });
    
    const [repoName, setRepoName] = useState(
        currentProject?.name?.toLowerCase().replace(/\s+/g, '-') || 'onlook-project'
    );
    const [description, setDescription] = useState('');
    const [isPrivate, setIsPrivate] = useState(true);
    const [createBranch, setCreateBranch] = useState(false);
    const [branchName, setBranchName] = useState('onlook-changes');

    const createRepository = api.github.createRepository.useMutation();
    const createBranchMutation = api.github.createBranch.useMutation();
    const exportFiles = api.github.createOrUpdateFiles.useMutation();
    const connectProject = api.github.connectProjectToRepository.useMutation();

    const [exportStep, setExportStep] = useState<'repository' | 'files' | 'complete'>('repository');

    const handleCreateRepository = async () => {
        if (!repoName.trim()) return;

        try {
            setExportStep('repository');
            
            // Create repository
            const repo = await createRepository.mutateAsync({
                name: repoName.trim(),
                description: description.trim() || undefined,
                private: isPrivate,
                owner: selectedOwner === 'personal' ? undefined : selectedOwner,
            });

            // Create branch if requested
            if (createBranch && branchName.trim()) {
                await createBranchMutation.mutateAsync({
                    owner: repo.owner.login,
                    repo: repo.name,
                    branchName: branchName.trim(),
                    fromBranch: repo.default_branch,
                });
            }

            setExportStep('files');

            // Export project files
            const projectFiles = await getProjectFiles();
            await exportFiles.mutateAsync({
                owner: repo.owner.login,
                repo: repo.name,
                files: projectFiles,
                message: 'Initial project export from Onlook',
                branch: createBranch && branchName.trim() ? branchName.trim() : repo.default_branch,
            });

            // Connect project to repository for future syncing
            await connectProject.mutateAsync({
                projectId: editorEngine.projectId,
                repositoryOwner: repo.owner.login,
                repositoryName: repo.name,
                repositoryId: repo.id,
                branch: createBranch && branchName.trim() ? branchName.trim() : repo.default_branch,
                githubUrl: repo.html_url,
            });

            setExportStep('complete');
            onRepositoryCreated(repo);
        } catch (error) {
            console.error('Failed to create repository:', error);
            setExportStep('repository');
        }
    };

    const getProjectFiles = async () => {
        const { ProjectExporter } = await import('../utils/project-exporter');
        
        return await ProjectExporter.exportProjectFiles(editorEngine.projectId, {
            projectName: repoName,
            description: description || undefined,
            includeAssets: true,
            includeMetadata: true,
        });
    };

    if (exportStep === 'files') {
        return (
            <div className="flex flex-col items-center gap-4 py-8">
                <Icons.LoadingSpinner className="h-8 w-8 animate-spin text-blue-500" />
                <div className="text-center">
                    <p className="text-sm font-medium text-foreground-primary mb-1">
                        Exporting project files...
                    </p>
                    <p className="text-xs text-foreground-secondary">
                        This may take a moment
                    </p>
                </div>
            </div>
        );
    }

    if (exportStep === 'complete') {
        return (
            <div className="flex flex-col items-center gap-4 py-4">
                <div className="w-12 h-12 bg-teal-100 dark:bg-teal-900/20 rounded-full flex items-center justify-center mb-2">
                    <Icons.Check className="h-6 w-6 text-teal-600 dark:text-teal-400" />
                </div>
                <div className="text-center">
                    <h4 className="text-sm font-semibold text-foreground-primary mb-1">
                        Repository created successfully!
                    </h4>
                    <p className="text-xs text-foreground-secondary mb-4">
                        Your project has been exported to GitHub
                    </p>
                    <Button
                        size="sm"
                        onClick={() => {
                            const url = `https://github.com/${selectedOwner === 'personal' ? 'USERNAME' : selectedOwner}/${repoName}`;
                            window.open(url, '_blank');
                        }}
                    >
                        <Icons.ExternalLink className="mr-2 h-4 w-4" />
                        View Repository
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-foreground-primary">
                    Create Repository
                </h4>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onBack}
                    className="h-6 px-2 text-xs"
                    disabled={createRepository.isPending}
                >
                    <Icons.ArrowLeft className="mr-1 h-3 w-3" />
                    Back
                </Button>
            </div>

            <div className="space-y-4">
                <div>
                    <Label htmlFor="repo-name" className="text-xs font-medium">
                        Repository Name
                    </Label>
                    <Input
                        id="repo-name"
                        value={repoName}
                        onChange={(e) => setRepoName(e.target.value)}
                        placeholder="my-awesome-project"
                        className="mt-1"
                        disabled={createRepository.isPending}
                    />
                    <p className="text-xs text-foreground-secondary mt-1">
                        {selectedOwner === 'personal' ? 'your-username' : selectedOwner}/{repoName}
                    </p>
                </div>

                <div>
                    <Label htmlFor="description" className="text-xs font-medium">
                        Description (optional)
                    </Label>
                    <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="A brief description of your project"
                        className="mt-1 min-h-[60px]"
                        disabled={createRepository.isPending}
                    />
                </div>

                <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="private"
                            checked={isPrivate}
                            onCheckedChange={(checked) => setIsPrivate(checked as boolean)}
                            disabled={createRepository.isPending}
                        />
                        <Label htmlFor="private" className="text-xs cursor-pointer">
                            Make this repository private
                        </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="create-branch"
                            checked={createBranch}
                            onCheckedChange={(checked) => setCreateBranch(checked as boolean)}
                            disabled={createRepository.isPending}
                        />
                        <Label htmlFor="create-branch" className="text-xs cursor-pointer">
                            Create a separate branch for changes
                        </Label>
                    </div>

                    {createBranch && (
                        <div className="ml-6">
                            <Input
                                value={branchName}
                                onChange={(e) => setBranchName(e.target.value)}
                                placeholder="feature-branch-name"
                                className="text-xs"
                                disabled={createRepository.isPending}
                            />
                        </div>
                    )}
                </div>

                <Button
                    onClick={handleCreateRepository}
                    disabled={!repoName.trim() || createRepository.isPending}
                    className="w-full"
                    size="sm"
                >
                    {createRepository.isPending ? (
                        <>
                            <Icons.LoadingSpinner className="mr-2 h-4 w-4 animate-spin" />
                            Creating Repository...
                        </>
                    ) : (
                        <>
                            <Icons.GitHubLogo className="mr-2 h-4 w-4" />
                            Create Repository & Export
                        </>
                    )}
                </Button>

                <div className="text-xs text-foreground-secondary">
                    <p className="flex items-center gap-1 mb-1">
                        <Icons.InfoCircled className="h-3 w-3" />
                        This will create a new repository and export your project files
                    </p>
                    <ul className="ml-4 space-y-0.5">
                        <li>• Project files will be committed to the repository</li>
                        <li>• You can sync future changes automatically</li>
                        <li>• Repository will be {isPrivate ? 'private' : 'public'}</li>
                    </ul>
                </div>
            </div>
        </div>
    );
});
'use client';

import { useEditorEngine } from '@/components/store/editor';
import { api } from '@/trpc/react';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Separator } from '@onlook/ui/separator';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { CreateRepositoryStep } from './create-repository';
import { InstallationStep } from './installation';
import { RepositoryConnectedStep } from './repository-connected';
import { SelectOwnerStep } from './select-owner';

export enum ExportStep {
    INSTALLATION = 'installation',
    SELECT_OWNER = 'select_owner', 
    CREATE_REPOSITORY = 'create_repository',
    REPOSITORY_CONNECTED = 'repository_connected',
}

export const GitHubExportDropdown = observer(() => {
    const editorEngine = useEditorEngine();
    const [currentStep, setCurrentStep] = useState<ExportStep>(ExportStep.INSTALLATION);
    const [selectedOwner, setSelectedOwner] = useState<string>('');
    const [repositoryData, setRepositoryData] = useState<any>(null);

    // Check if GitHub App is installed
    const { data: installationId, isLoading: checkingInstallation, error: installationError } = 
        api.github.checkGitHubAppInstallation.useQuery();

    // Check if project is already connected to GitHub
    const { data: existingConnection } = api.github.getProjectRepositoryConnection.useQuery(
        { projectId: editorEngine.projectId },
        { enabled: !!installationId && !installationError }
    );

    // Get organizations if installed
    const { data: organizations = [], isLoading: loadingOrgs } = 
        api.github.getOrganizations.useQuery(undefined, {
            enabled: !!installationId && currentStep === ExportStep.SELECT_OWNER,
        });

    // Determine the current step based on installation status
    const determineStep = () => {
        if (checkingInstallation) return ExportStep.INSTALLATION;
        if (installationError || !installationId) return ExportStep.INSTALLATION;
        if (existingConnection || repositoryData) return ExportStep.REPOSITORY_CONNECTED;
        if (!selectedOwner) return ExportStep.SELECT_OWNER;
        return ExportStep.CREATE_REPOSITORY;
    };

    const actualStep = determineStep();

    const renderStep = () => {
        switch (actualStep) {
            case ExportStep.INSTALLATION:
                return (
                    <InstallationStep 
                        isLoading={checkingInstallation}
                        hasError={!!installationError}
                        onInstalled={() => setCurrentStep(ExportStep.SELECT_OWNER)}
                    />
                );
            case ExportStep.SELECT_OWNER:
                return (
                    <SelectOwnerStep
                        organizations={organizations}
                        isLoading={loadingOrgs}
                        selectedOwner={selectedOwner}
                        onOwnerSelect={(owner) => {
                            setSelectedOwner(owner);
                            setCurrentStep(ExportStep.CREATE_REPOSITORY);
                        }}
                        onBack={() => setCurrentStep(ExportStep.INSTALLATION)}
                    />
                );
            case ExportStep.CREATE_REPOSITORY:
                return (
                    <CreateRepositoryStep
                        selectedOwner={selectedOwner}
                        onRepositoryCreated={(repo) => {
                            setRepositoryData(repo);
                        }}
                        onBack={() => {
                            setSelectedOwner('');
                            setCurrentStep(ExportStep.SELECT_OWNER);
                        }}
                    />
                );
            case ExportStep.REPOSITORY_CONNECTED:
                const connectedRepoData = repositoryData || (existingConnection ? {
                    id: 0, // We don't store the GitHub repo ID in our schema
                    name: existingConnection.repositoryName,
                    full_name: existingConnection.fullName,
                    html_url: existingConnection.repositoryUrl,
                    owner: {
                        login: existingConnection.repositoryOwner,
                        avatar_url: '', // We don't store avatar URL
                    },
                } : null);
                
                return connectedRepoData ? (
                    <RepositoryConnectedStep
                        repositoryData={connectedRepoData}
                        onBack={() => {
                            setRepositoryData(null);
                            setSelectedOwner('');
                            setCurrentStep(ExportStep.SELECT_OWNER);
                        }}
                    />
                ) : null;
            default:
                return null;
        }
    };

    return (
        <div className="rounded-md flex flex-col text-foreground-secondary">
            <div className="p-4 pb-0">
                <div className="flex items-center gap-2 mb-4">
                    <Icons.GitHubLogo className="h-5 w-5" />
                    <h3 className="text-sm font-semibold text-foreground-primary">
                        Export to GitHub
                    </h3>
                </div>
                
                {/* Step indicator - only show when not connected */}
                {actualStep !== ExportStep.REPOSITORY_CONNECTED && (
                    <div className="flex items-center gap-2 mb-4">
                        <StepIndicator 
                            step={1} 
                            isActive={actualStep === ExportStep.INSTALLATION} 
                            isCompleted={!!installationId && !installationError} 
                            label="Install App" 
                        />
                        <div className="h-px bg-border flex-1" />
                        <StepIndicator 
                            step={2} 
                            isActive={actualStep === ExportStep.SELECT_OWNER} 
                            isCompleted={!!selectedOwner} 
                            label="Select Owner" 
                        />
                        <div className="h-px bg-border flex-1" />
                        <StepIndicator 
                            step={3} 
                            isActive={actualStep === ExportStep.CREATE_REPOSITORY} 
                            isCompleted={!!repositoryData} 
                            label="Create Repo" 
                        />
                    </div>
                )}
            </div>

            <Separator />
            
            <div className="p-4">
                {renderStep()}
            </div>
        </div>
    );
});

interface StepIndicatorProps {
    step: number;
    isActive: boolean;
    isCompleted: boolean;
    label: string;
}

const StepIndicator = ({ step, isActive, isCompleted, label }: StepIndicatorProps) => (
    <div className="flex flex-col items-center gap-1">
        <div className={cn(
            'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors',
            isCompleted 
                ? 'bg-teal-500 text-white' 
                : isActive 
                    ? 'bg-foreground-primary text-background' 
                    : 'bg-background-secondary text-foreground-secondary'
        )}>
            {isCompleted ? <Icons.Check className="h-3 w-3" /> : step}
        </div>
        <span className={cn(
            'text-xs',
            isActive ? 'text-foreground-primary' : 'text-foreground-secondary'
        )}>
            {label}
        </span>
    </div>
);

function cn(...classes: (string | undefined)[]) {
    return classes.filter(Boolean).join(' ');
}
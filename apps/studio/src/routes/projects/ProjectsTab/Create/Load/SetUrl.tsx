import { invokeMainChannel } from '@/lib/utils';
import { DefaultSettings, MainChannels } from '@onlook/models/constants';
import { Button } from '@onlook/ui/button';
import { CardDescription, CardTitle } from '@onlook/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@onlook/ui/collapsible';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { Label } from '@onlook/ui/label';
import { cn } from '@onlook/ui/utils';
import type React from 'react';
import { useState } from 'react';
import type { StepComponent } from '../withStepProps';

const LoadSetUrl: StepComponent = ({ props, variant }) => {
    const { projectData, setProjectData, prevStep, nextStep } = props;
    const [projectUrl, setProjectUrl] = useState<string>(projectData.url || '');
    const [runCommand, setRunCommand] = useState<string>(projectData.commands?.run || '');
    const [buildCommand, setBuildCommand] = useState<string>(projectData.commands?.build || '');
    const [installCommand, setInstallCommand] = useState<string>(
        projectData.commands?.install || '',
    );
    const [error, setError] = useState<string | null>(null);
    const [isOpen, setIsOpen] = useState(false);

    function handleUrlInput(e: React.FormEvent<HTMLInputElement>) {
        setProjectUrl(e.currentTarget.value);
        if (!validateUrl(e.currentTarget.value)) {
            setError('Please use a valid URL');
            return;
        } else {
            setError(null);
        }
        setProjectData({
            ...projectData,
            url: e.currentTarget.value,
        });
    }

    function handleInstallCommandInput(e: React.FormEvent<HTMLInputElement>) {
        setInstallCommand(e.currentTarget.value);
        setProjectData({
            ...projectData,
            commands: {
                ...projectData.commands,
                install: e.currentTarget.value,
            },
        });
    }

    function handleRunCommandInput(e: React.FormEvent<HTMLInputElement>) {
        setRunCommand(e.currentTarget.value);
        setProjectData({
            ...projectData,
            commands: {
                ...projectData.commands,
                run: e.currentTarget.value,
            },
        });
    }

    function handleBuildCommandInput(e: React.FormEvent<HTMLInputElement>) {
        setBuildCommand(e.currentTarget.value);
        setProjectData({
            ...projectData,
            commands: {
                ...projectData.commands,
                build: e.currentTarget.value,
            },
        });
    }

    function validateUrl(url: string): boolean {
        try {
            const parsedUrl = new URL(url);
            return ['http:', 'https:'].includes(parsedUrl.protocol);
        } catch (e) {
            return false;
        }
    }

    function goBack() {
        invokeMainChannel(MainChannels.VERIFY_PROJECT, projectData.folderPath);
        prevStep();
    }

    function handleNext() {
        if (!projectData.folderPath) {
            setError('No project folder path found');
            return;
        }

        const updatedInstallCommand = projectData.commands?.install || installCommand;

        if (!updatedInstallCommand) {
            setError('Please enter a valid install command');
            return;
        }

        invokeMainChannel(MainChannels.INSTALL_PROJECT_DEPENDENCIES, {
            folderPath: projectData.folderPath,
            installCommand: updatedInstallCommand,
        });
        nextStep();
    }

    const renderHeader = () => (
        <>
            <CardTitle>{'Configure your project (optional)'}</CardTitle>
            <CardDescription>
                {'Update your project URL and commands or keep the defaults.'}
            </CardDescription>
        </>
    );

    const renderContent = () => (
        <div className="flex flex-col w-full gap-6">
            <div className="space-y-2">
                <Label htmlFor="projectUrl">Local URL</Label>
                <Input
                    id="projectUrl"
                    className="bg-secondary"
                    value={projectUrl}
                    type="text"
                    placeholder="http://localhost:3000"
                    onInput={handleUrlInput}
                />
            </div>

            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium">
                    <Icons.ChevronDown
                        className={cn(
                            'h-4 w-4 transition-transform duration-200',
                            isOpen ? '' : '-rotate-90',
                        )}
                    />
                    Project Commands
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4">
                    <div className="space-y-3">
                        <div className="space-y-2">
                            <Label htmlFor="installCommand">Install</Label>
                            <Input
                                id="installCommand"
                                className="bg-secondary"
                                value={installCommand}
                                type="text"
                                placeholder={DefaultSettings.COMMANDS.install}
                                onInput={handleInstallCommandInput}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="runCommand">Run</Label>
                            <Input
                                id="runCommand"
                                className="bg-secondary"
                                value={runCommand}
                                type="text"
                                placeholder={DefaultSettings.COMMANDS.run}
                                onInput={handleRunCommandInput}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="buildCommand">Build</Label>
                            <Input
                                id="buildCommand"
                                className="bg-secondary"
                                value={buildCommand}
                                type="text"
                                placeholder={DefaultSettings.COMMANDS.build}
                                onInput={handleBuildCommandInput}
                            />
                        </div>
                    </div>
                </CollapsibleContent>
            </Collapsible>

            <p className="text-red-500 text-sm">{error || ''}</p>
        </div>
    );

    const renderFooter = () => (
        <>
            <Button type="button" onClick={goBack} variant="ghost">
                Back
            </Button>
            <Button
                disabled={
                    !projectData.url ||
                    projectData.url.length === 0 ||
                    !projectData.commands?.run ||
                    projectData.commands?.run.length === 0 ||
                    !projectData.commands?.build ||
                    projectData.commands?.build.length === 0
                }
                type="button"
                onClick={handleNext}
                variant="outline"
            >
                {'Next'}
            </Button>
        </>
    );

    switch (variant) {
        case 'header':
            return renderHeader();
        case 'content':
            return renderContent();
        case 'footer':
            return renderFooter();
    }
};

LoadSetUrl.Header = (props) => <LoadSetUrl props={props} variant="header" />;
LoadSetUrl.Content = (props) => <LoadSetUrl props={props} variant="content" />;
LoadSetUrl.Footer = (props) => <LoadSetUrl props={props} variant="footer" />;
LoadSetUrl.Header.displayName = 'LoadSetUrl.Header';
LoadSetUrl.Content.displayName = 'LoadSetUrl.Content';
LoadSetUrl.Footer.displayName = 'LoadSetUrl.Footer';

export { LoadSetUrl };

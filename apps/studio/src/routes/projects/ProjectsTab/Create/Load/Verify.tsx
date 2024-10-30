import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@onlook/ui/alert-dialog';
import { Button } from '@onlook/ui/button';
import { CardDescription, CardTitle } from '@onlook/ui/card';
import { sendAnalytics } from '@/lib/utils';
import { CreateMethod } from '@/routes/projects/helpers';
import type { SetupStage, VerifyStage } from '@onlook/foundation';
import { cn } from '@onlook/ui/utils';
import { useEffect, useState } from 'react';
import type { StepComponent } from '../withStepProps';
import { MainChannels } from '/common/constants';
import { Icons } from '@onlook/ui/icons';

enum StepState {
    VERIFYING = 'verifying',
    INSTALLING = 'installing',
    INSTALLED = 'installed',
    NOT_INSTALLED = 'not_installed',
    ERROR = 'error',
}

const LoadVerifyProject: StepComponent = ({ props, variant }) => {
    const { projectData, setProjectData, prevStep, nextStep } = props;
    const [state, setState] = useState<StepState>(StepState.VERIFYING);
    const [progressMessage, setProgressMessage] = useState<string>('Starting...');
    const [isSkipDialogOpen, setIsSkipDialogOpen] = useState(false);

    useEffect(() => {
        if (!projectData.folderPath) {
            throw new Error('Folder path is not provided');
        }
        window.api.on(
            MainChannels.VERIFY_PROJECT_CALLBACK,
            ({ stage, message }: { stage: VerifyStage; message: string }) => {
                setProgressMessage(message);
                if (stage === 'checking') {
                    setState(StepState.VERIFYING);
                } else if (stage === 'not_installed') {
                    setState(StepState.NOT_INSTALLED);
                } else if (stage === 'installed') {
                    setState(StepState.INSTALLED);
                } else if (stage === 'error') {
                    setState(StepState.ERROR);
                    sendAnalytics('verify project error', { message, method: CreateMethod.LOAD });
                }
            },
        );
        window.api.on(
            MainChannels.SETUP_PROJECT_CALLBACK,
            ({ stage, message }: { stage: SetupStage; message: string }) => {
                setProgressMessage(message);
                if (stage === 'installing' || stage === 'configuring') {
                    setState(StepState.INSTALLING);
                } else if (stage === 'complete') {
                    setState(StepState.INSTALLED);
                } else if (stage === 'error') {
                    setState(StepState.ERROR);
                    sendAnalytics('setup project error', { message, method: CreateMethod.LOAD });
                }
            },
        );
        return () => {
            window.api.removeAllListeners(MainChannels.VERIFY_PROJECT_CALLBACK);
            window.api.removeAllListeners(MainChannels.SETUP_PROJECT_CALLBACK);
        };
    }, [projectData.folderPath]);

    async function installOnlook() {
        setState(StepState.INSTALLING);
        window.api.invoke(MainChannels.SETUP_PROJECT, projectData.folderPath);
    }

    function handleSelectDifferentFolder() {
        setProjectData({ ...projectData, folderPath: undefined });
        prevStep();
    }

    function handleClickPath() {
        window.api.invoke(MainChannels.OPEN_IN_EXPLORER, projectData.folderPath);
    }

    const renderHeader = () => (
        <>
            <CardTitle>{renderTitle()}</CardTitle>
            <CardDescription>{renderDescription()}</CardDescription>
        </>
    );

    const renderContent = () => {
        if (state === StepState.INSTALLING || state === StepState.VERIFYING) {
            return (
                <div className="w-full flex flex-row items-center border-[0.5px] p-4 rounded gap-2">
                    <Icons.Shadow className="animate-spin" />
                    <p className="text-sm">{progressMessage}</p>
                </div>
            );
        }

        if (state === StepState.ERROR) {
            return (
                <div className="text-sm w-full flex flex-row items-center border-[0.5px] p-4 rounded gap-2 border-red-600 text-red-200 bg-red-900">
                    <p>{progressMessage}</p>
                </div>
            );
        }

        function boxDecoration() {
            if (state === StepState.INSTALLED) {
                return 'text-green-950 bg-green-100/40 border-green-400 dark:border-green-500 dark:text-green-300 dark:bg-green-950';
            } else if (state === StepState.NOT_INSTALLED) {
                return 'border-gray-400 text-gray-200 bg-gray-800';
            } else if (state === StepState.ERROR) {
                return 'border-red-600 text-red-200 bg-red-900';
            }
        }

        return (
            <div
                className={cn(
                    'w-full flex flex-row items-center border-[0.5px] p-4 rounded gap-1',
                    boxDecoration(),
                )}
            >
                <div className={'flex flex-col text-sm gap-1 break-all'}>
                    <p className="text-regularPlus">{projectData.name}</p>
                    <button
                        className="hover:underline text-mini text-start"
                        onClick={handleClickPath}
                    >
                        {projectData.folderPath}
                    </button>
                </div>
                {state === StepState.INSTALLED ? (
                    <Icons.CheckCircled className="ml-auto" />
                ) : (
                    <Icons.QuestionMarkCircled className="ml-auto" />
                )}
            </div>
        );
    };

    const renderFooter = () => (
        <>
            <Button type="button" onClick={handleSelectDifferentFolder} variant="ghost">
                Select a different folder
            </Button>
            {renderSkipButton()}
            {renderPrimaryButton()}
        </>
    );

    function renderTitle() {
        if (state === StepState.VERIFYING) {
            return 'Verifying project...';
        } else if (state === StepState.INSTALLING) {
            return 'Setting up Onlook...';
        } else if (state === StepState.INSTALLED) {
            return 'Onlook is installed';
        } else if (state === StepState.NOT_INSTALLED) {
            return 'Onlook is not installed';
        } else if (state === StepState.ERROR) {
            return 'Something went wrong';
        }
    }

    function renderDescription(): string | JSX.Element {
        if (state === StepState.VERIFYING) {
            return 'Checking your dependencies and configurations';
        } else if (state === StepState.INSTALLING) {
            return 'Setting up your dependencies and configurations';
        } else if (state === StepState.NOT_INSTALLED) {
            return 'It takes one second to install Onlook on your project';
        } else if (state === StepState.INSTALLED) {
            return 'Your project is all set up';
        } else if (state === StepState.ERROR) {
            return (
                <p>
                    {`Please `}
                    <a href="mailto:support@onlook.dev" className="underline">
                        {'contact support'}
                    </a>
                    {` for help. Or run 'npx onlook setup' in your project folder instead.`}
                </p>
            );
        } else {
            return 'Setting up project...';
        }
    }

    function renderSkipButton() {
        if (
            state === StepState.VERIFYING ||
            state === StepState.ERROR ||
            state === StepState.NOT_INSTALLED
        ) {
            return (
                <>
                    <AlertDialog open={isSkipDialogOpen}>
                        <AlertDialogTrigger asChild>
                            <Button
                                variant="ghost"
                                onClick={() => {
                                    setIsSkipDialogOpen(true);
                                }}
                            >
                                Skip
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Skip verification?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    <p className="text-sm">
                                        {'You can always setup Onlook later by running '}
                                        <span className="text-teal">npx onlook setup</span>
                                        {' in your project folder'}
                                    </p>
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <Button
                                    variant="ghost"
                                    onClick={() => {
                                        setIsSkipDialogOpen(false);
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setIsSkipDialogOpen(false);
                                        nextStep();
                                    }}
                                >
                                    Skip
                                </Button>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </>
            );
        }
    }

    function renderPrimaryButton() {
        if (
            state === StepState.INSTALLING ||
            state === StepState.VERIFYING ||
            state === StepState.ERROR
        ) {
            return (
                <Button disabled variant={'outline'}>
                    {'Next'}
                </Button>
            );
        } else if (state === StepState.INSTALLED) {
            return (
                <Button variant={'outline'} onClick={nextStep}>
                    {'Next'}
                </Button>
            );
        } else if (state === StepState.NOT_INSTALLED) {
            return (
                <Button variant={'outline'} onClick={installOnlook}>
                    {'Install Onlook'}
                </Button>
            );
        }
    }

    switch (variant) {
        case 'header':
            return renderHeader();
        case 'content':
            return renderContent();
        case 'footer':
            return renderFooter();
    }
};

LoadVerifyProject.Header = (props) => <LoadVerifyProject props={props} variant="header" />;
LoadVerifyProject.Content = (props) => <LoadVerifyProject props={props} variant="content" />;
LoadVerifyProject.Footer = (props) => <LoadVerifyProject props={props} variant="footer" />;
LoadVerifyProject.Header.displayName = 'LoadVerifyProject.Header';
LoadVerifyProject.Content.displayName = 'LoadVerifyProject.Content';
LoadVerifyProject.Footer.displayName = 'LoadVerifyProject.Footer';

export { LoadVerifyProject };

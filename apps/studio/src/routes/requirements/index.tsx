import { useRequirementsManager, useRouteManager } from '@/components/Context';
import { Dunes } from '@/components/ui/dunes';
import { Route } from '@/lib/routing';
import { invokeMainChannel } from '@/lib/utils';
import { MainChannels } from '@onlook/models/constants';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { observer } from 'mobx-react-lite';

const Requirements = observer(() => {
    const reqManager = useRequirementsManager();
    const routeManager = useRouteManager();

    function openExternalLink(url: string) {
        invokeMainChannel(MainChannels.OPEN_EXTERNAL_WINDOW, url);
    }

    function handleContinue() {
        routeManager.route = Route.PROJECTS;
    }

    return (
        <div className="flex h-[calc(100vh-2.5rem)]">
            <div className="flex flex-col justify-between w-full h-full max-w-xl p-16 space-y-8 overflow-auto">
                <div className="flex items-center space-x-2">
                    <Icons.OnlookTextLogo viewBox="0 0 139 17" />
                </div>

                <div className="space-y-8">
                    <div className="space-y-4">
                        <h2 className="text-title2 leading-tight">
                            {"Let's make sure you can use Onlook"}
                        </h2>
                        <p className="text-foreground-onlook text-regular">
                            These are required so that you can use Onlook with sites and apps. These
                            are very standard requirements for coding.
                        </p>
                    </div>
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="flex items-center space-x-3">
                                        <div className="p-2 bg-background-secondary rounded-lg">
                                            <Icons.Cube className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="flex flex-row gap-1 items-center">
                                                <h3 className="text-regularPlus">
                                                    Node.js Runtime
                                                </h3>{' '}
                                                <Icons.QuestionMarkCircled className=" text-foreground-secondary" />
                                            </div>
                                            <p className="text-small text-foreground-onlook">
                                                Project execution environment
                                            </p>
                                        </div>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="">
                                        {
                                            'Node is required to run React projects and other JavaScript applications.'
                                        }
                                    </p>
                                </TooltipContent>
                            </Tooltip>

                            <Button
                                variant="outline"
                                disabled={!!reqManager.nodeEnabled}
                                onClick={() => openExternalLink('https://nodejs.org')}
                                className="bg-background-onlook"
                            >
                                {reqManager.nodeEnabled ? 'Installed' : 'Install'}
                            </Button>
                        </div>

                        <div className="flex justify-between items-center">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="flex items-center space-x-3">
                                        <div className="p-2 bg-background-secondary rounded-lg">
                                            <Icons.GitHubLogo className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="flex flex-row gap-1 items-center">
                                                <h3 className="text-regularPlus">Git</h3>{' '}
                                                <Icons.QuestionMarkCircled className="text-foreground-secondary" />
                                            </div>
                                            <p className="text-small text-foreground-onlook">
                                                Version control system
                                            </p>
                                        </div>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="">
                                        {'Git is used to setup and manage project versions.'}
                                    </p>
                                </TooltipContent>
                            </Tooltip>

                            <Button
                                variant="outline"
                                disabled={!!reqManager.gitEnabled}
                                onClick={() => openExternalLink('https://git-scm.com')}
                                className="bg-background-onlook"
                            >
                                {reqManager.gitEnabled ? 'Installed' : 'Install'}
                            </Button>
                        </div>
                    </div>
                    <div className="flex flex-row justify-end w-full">
                        <Button
                            variant="outline"
                            disabled={!reqManager.requirementsMet}
                            onClick={handleContinue}
                        >
                            Continue
                        </Button>
                    </div>
                </div>

                <div className="flex flex-row space-x-1 text-small text-gray-600">
                    <p>{`Version ${window.env.APP_VERSION}`}</p>
                </div>
            </div>
            <Dunes />
        </div>
    );
});

export default Requirements;

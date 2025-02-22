import { useEditorEngine } from '@/components/Context';
import { SettingsTabValue } from '@/lib/models';
import { DomainType, type DomainSettings } from '@onlook/models/projects';
import { Button } from '@onlook/ui/button';
import { Progress } from '@onlook/ui/progress';
import { timeAgo } from '@onlook/utility';
import { observer } from 'mobx-react-lite';
import type { PublishState } from '.';
import { UrlSection } from './Url';

export const DomainSection = observer(
    ({
        setIsOpen,
        domain,
        type,
        state,
    }: {
        setIsOpen: (isOpen: boolean) => void;
        domain: DomainSettings | null;
        type: DomainType;
        state: PublishState;
    }) => {
        const editorEngine = useEditorEngine();

        const openCustomDomain = () => {
            setIsOpen(false);
            editorEngine.settingsTab = SettingsTabValue.DOMAIN;
            editorEngine.isSettingsOpen = true;
        };

        const renderNoDomainBase = () => {
            return (
                <>
                    <div className="flex items-center w-full">
                        <h3 className="">Base Domain</h3>
                    </div>

                    <Button className="w-full rounded-md p-3">Publish preview site</Button>
                </>
            );
        };

        const renderNoDomainCustom = () => {
            return (
                <>
                    <div className="flex items-center w-full">
                        <h3 className="">Custom Domain</h3>
                        <span className="ml-auto rounded-full bg-blue-400 text-white px-1.5 py-0.5 text-xs">
                            PRO
                        </span>
                    </div>

                    <Button
                        onClick={openCustomDomain}
                        className="w-full rounded-md p-3 bg-blue-400 hover:bg-blue-500"
                    >
                        Link a Custom Domain
                    </Button>
                </>
            );
        };

        const renderDomain = () => {
            if (!domain) {
                return 'Something went wrong';
            }

            return (
                <>
                    <div className="flex items-center w-full">
                        <h3 className="">
                            {type === DomainType.BASE ? 'Base Domain' : 'Custom Domain'}
                        </h3>

                        {state.status === 'success' && (
                            <div className="ml-auto flex items-center gap-2">
                                <p className="text-green-300">Live</p>
                                <p>•</p>
                                <p>Updated {timeAgo({ date: domain.publishedAt })}</p>
                            </div>
                        )}
                        {state.status === 'error' && (
                            <div className="ml-auto flex items-center gap-2">
                                <p className="text-red-500">Error</p>
                            </div>
                        )}
                        {state.status === 'loading' && (
                            <div className="ml-auto flex items-center gap-2">
                                <p className="">Updating • In progress</p>
                            </div>
                        )}
                    </div>
                    {renderActionSection()}
                </>
            );
        };

        const renderActionSection = () => {
            if (!domain) {
                return 'Something went wrong';
            }

            return (
                <div className="w-full flex flex-col gap-2">
                    <UrlSection url={domain.url} />
                    {state.status === 'success' && (
                        <Button variant="outline" className="w-full rounded-md p-3">
                            Update
                        </Button>
                    )}
                    {state.status === 'error' && (
                        <div className="w-full flex flex-col gap-2">
                            <p className="text-red-500 max-h-20 overflow-y-auto">{state.error}</p>
                            <Button variant="outline" className="w-full rounded-md p-3">
                                Retry
                            </Button>
                        </div>
                    )}
                    {state.status === 'loading' && (
                        <div className="w-full flex flex-col gap-2">
                            <Progress className="w-full" />
                            <p>{state.message}</p>
                        </div>
                    )}
                </div>
            );
        };

        return (
            <div className="p-4 flex flex-col items-center gap-2">
                {domain
                    ? renderDomain()
                    : type === DomainType.BASE
                      ? renderNoDomainBase()
                      : renderNoDomainCustom()}
            </div>
        );
    },
);

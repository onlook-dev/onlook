import { useEditorEngine } from '@/components/Context';
import { SettingsTabValue } from '@/lib/models';
import { Button } from '@onlook/ui/button';
import { observer } from 'mobx-react-lite';

export const CustomDomainSection = observer(
    ({ setIsOpen }: { setIsOpen: (isOpen: boolean) => void }) => {
        const editorEngine = useEditorEngine();

        const openCustomDomain = () => {
            setIsOpen(false);
            editorEngine.settingsTab = SettingsTabValue.DOMAIN;
            editorEngine.isSettingsOpen = true;
        };

        return (
            <div className="p-2 flex flex-col items-center gap-2">
                <div className="flex items-center w-full">
                    <h3 className="">Custom Domain</h3>
                    <span className="ml-auto rounded-full bg-blue-400 text-white px-1.5 py-0.5 text-xs">
                        PRO
                    </span>
                </div>

                <Button onClick={openCustomDomain} className="w-full rounded-md p-3 bg-blue-400">
                    Link a Custom Domain
                </Button>
            </div>
        );
    },
);

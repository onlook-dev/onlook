import { useUserManager } from '@/components/Context';
import { invokeMainChannel } from '@/lib/utils';
import { DefaultSettings, MainChannels } from '@onlook/models/constants';
import { Button } from '@onlook/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { observer } from 'mobx-react-lite';

const AdvancedTab = observer(() => {
    const userManager = useUserManager();
    const enableBunReplace =
        userManager.settings.settings?.editor?.enableBunReplace ??
        DefaultSettings.EDITOR_SETTINGS.enableBunReplace;
    const newProjectPath =
        userManager.settings.settings?.editor?.newProjectPath ??
        userManager.settings.defaultProjectPath;
    const buildFlags =
        userManager.settings.settings?.editor?.buildFlags ??
        DefaultSettings.EDITOR_SETTINGS.buildFlags;

    function updateBunReplace(enabled: boolean) {
        userManager.settings.updateEditor({ enableBunReplace: enabled });
    }

    function updateNewProjectPath(path: string) {
        userManager.settings.updateEditor({ newProjectPath: path });
    }

    function updateBuildFlags(flags: string) {
        userManager.settings.updateEditor({ buildFlags: flags });
    }

    async function selectNewProjectPath() {
        const path: string | null = await invokeMainChannel(MainChannels.PICK_COMPONENTS_DIRECTORY);

        if (path) {
            updateNewProjectPath(path);
        }
    }

    return (
        <div className="flex flex-col gap-8 p-4">
            <div className="flex justify-between items-center gap-4">
                <div className="flex flex-col gap-2">
                    <p className="text-largePlus">{'Default project path'}</p>
                    <p className="text-foreground-onlook text-small">
                        {'Where to install new projects'}
                    </p>
                </div>
                <div className="flex items-center gap-2 w-96">
                    <Input
                        readOnly={true}
                        id="folderPath"
                        value={newProjectPath ?? ''}
                        onChange={(e) => updateNewProjectPath(e.target.value)}
                    />
                    <Button size={'icon'} variant={'outline'} onClick={selectNewProjectPath}>
                        <Icons.Directory />
                    </Button>
                </div>
            </div>
            <div className="flex justify-between items-center gap-4">
                <div className="flex flex-col gap-2">
                    <p className="text-largePlus">{'Build flags'}</p>
                    <p className="text-foreground-onlook text-small">
                        {'Additional flags to pass to the build command'}
                    </p>
                </div>
                <div className="flex items-center gap-2 w-96">
                    <Input
                        id="buildFlags"
                        value={buildFlags}
                        onChange={(e) => updateBuildFlags(e.target.value)}
                    />
                </div>
            </div>
            <div className="flex justify-between items-center gap-4">
                <div className="flex flex-col gap-2">
                    <p className="text-largePlus">{'Replace npm with bun'}</p>
                    <p className="text-foreground-onlook text-small">
                        {'Automatically replace npm commands with built-in bun runtime'}
                    </p>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="text-smallPlus min-w-[150px]">
                            {enableBunReplace ? 'On' : 'Off'}
                            <Icons.ChevronDown className="ml-auto" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="text-smallPlus min-w-[150px]">
                        <DropdownMenuItem onClick={() => updateBunReplace(true)}>
                            {'On'}{' '}
                            <Icons.Check className={enableBunReplace ? 'ml-auto' : 'hidden'} />
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateBunReplace(false)}>
                            {'Off'}{' '}
                            <Icons.Check className={!enableBunReplace ? 'ml-auto' : 'hidden'} />
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
});

export default AdvancedTab;

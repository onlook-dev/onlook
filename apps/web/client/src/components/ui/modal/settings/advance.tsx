import { useUserManager } from '@/components/store/user';
import { DefaultSettings } from '@onlook/constants';
import { Button } from '@onlook/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { isNullOrUndefined } from '@onlook/utility';
import { observer } from 'mobx-react-lite';

const AdvancedTab = observer(() => {
    const userManager = useUserManager();
    const enableBunReplace =
        userManager.settings.settings?.editor?.enableBunReplace ??
        DefaultSettings.EDITOR_SETTINGS.enableBunReplace;
    const newProjectPath =
        userManager.settings.settings?.editor?.newProjectPath ??
        userManager.settings.defaultProjectPath;
    const buildFlags = isNullOrUndefined(userManager.settings.settings?.editor?.buildFlags)
        ? DefaultSettings.EDITOR_SETTINGS.buildFlags
        : userManager.settings.settings?.editor?.buildFlags;

    async function updateBunReplace(enabled: boolean) {
        await userManager.settings.updateEditor({ enableBunReplace: enabled });
    }

    async function updateNewProjectPath(path: string) {
        await userManager.settings.updateEditor({ newProjectPath: path });
    }

    async function updateBuildFlags(flags: string) {
        await userManager.settings.updateEditor({ buildFlags: flags });
    }

    async function selectNewProjectPath() {
        const path: string | null = await invokeMainChannel(MainChannels.PICK_COMPONENTS_DIRECTORY);

        if (path) {
            await updateNewProjectPath(path);
        }
    }

    return (
        <div className="flex flex-col gap-8 p-6">
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

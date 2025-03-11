import { useUserManager } from '@/components/Context';
import { Button } from '@onlook/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { observer } from 'mobx-react-lite';

const AdvancedTab = observer(() => {
    const userManager = useUserManager();
    const enableBunReplace = userManager.settings.settings?.editor?.enableBunReplace ?? true;
    const buildFlags = userManager.settings.settings?.editor?.buildFlags ?? '';
    const customProjectsPath = userManager.settings.settings?.editor?.customProjectsPath ?? '';

    function updateBunReplace(enabled: boolean) {
        userManager.settings.updateEditor({ enableBunReplace: enabled });
    }

    function updateBuildFlags(flags: string) {
        userManager.settings.updateEditor({ buildFlags: flags });
    }

    function updateCustomProjectsPath(path: string) {
        userManager.settings.updateEditor({ customProjectsPath: path });
    }

    return (
        <div className="flex flex-col gap-8 p-4">
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

            <div className="flex justify-between items-center gap-4">
                <div className="flex flex-col gap-2">
                    <p className="text-largePlus">{'Build flags'}</p>
                    <p className="text-foreground-onlook text-small">
                        {'Configure additional flags for build commands (e.g. --no-lint)'}
                    </p>
                </div>
                <input
                    type="text"
                    value={buildFlags}
                    onChange={(e) => updateBuildFlags(e.target.value)}
                    className="border rounded p-2 min-w-[150px] text-smallPlus"
                    placeholder="--no-lint"
                />
            </div>

            <div className="flex justify-between items-center gap-4">
                <div className="flex flex-col gap-2">
                    <p className="text-largePlus">{'Custom projects path'}</p>
                    <p className="text-foreground-onlook text-small">
                        {'Set a custom location for new projects instead of Documents folder'}
                    </p>
                </div>
                <input
                    type="text"
                    value={customProjectsPath}
                    onChange={(e) => updateCustomProjectsPath(e.target.value)}
                    className="border rounded p-2 min-w-[150px] text-smallPlus"
                    placeholder="/path/to/projects"
                />
            </div>
        </div>
    );
});

export default AdvancedTab;

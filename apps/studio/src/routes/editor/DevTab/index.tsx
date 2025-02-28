import { useEditorEngine } from '@/components/Context';
import { Icons } from '@onlook/ui/icons';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@onlook/ui/tabs';
import { Separator } from '@onlook/ui/separator';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';

enum TabValue {
    CONSOLE = 'console',
    NETWORK = 'network',
    ELEMENTS = 'elements',
}

const DevTab = observer(() => {
    const editorEngine = useEditorEngine();
    const [selectedTab, setSelectedTab] = useState<TabValue>(TabValue.CONSOLE);

    const handleTabChange = (value: string) => {
        setSelectedTab(value as TabValue);
    };

    return (
        <div className="h-full flex flex-col w-full border-l-[0.5px] border-t-[0.5px] border-b-[0.5px] backdrop-blur shadow rounded-tl-xl">
            {/* Top Bar with Edit Code and Files dropdowns */}
            <div className="flex items-center justify-between h-11 px-4 rounded-tl-xl border-b-[0.5px]">
                <div className="flex items-center space-x-4">
                    <DropdownMenu>
                        <DropdownMenuTrigger className="flex items-center text-foreground text-sm hover:text-foreground-hover">
                            <span className="mr-1">Edit Code</span>
                            <Icons.ChevronDown className="h-3 w-3" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem>Undo</DropdownMenuItem>
                            <DropdownMenuItem>Redo</DropdownMenuItem>
                            <DropdownMenuItem>Cut</DropdownMenuItem>
                            <DropdownMenuItem>Copy</DropdownMenuItem>
                            <DropdownMenuItem>Paste</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                        <DropdownMenuTrigger className="flex items-center text-foreground text-sm hover:text-foreground-hover">
                            <span className="mr-1">Files</span>
                            <Icons.ChevronDown className="h-3 w-3" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem>New File</DropdownMenuItem>
                            <DropdownMenuItem>Open File</DropdownMenuItem>
                            <DropdownMenuItem>Save</DropdownMenuItem>
                            <DropdownMenuItem>Save As</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <button className="text-foreground hover:text-foreground-hover">
                    <Icons.CrossS className="h-4 w-4" />
                </button>
            </div>

            {/* Second Bar with index.tsx and three dots menu */}
            <div className="flex items-center justify-between h-10 border-b-[0.5px]">
                <div className="flex items-center">
                    <div className="text-foreground text-sm border-r-[0.5px] px-4">Index.tsx</div>
                </div>

                <div className="border-l-[0.5px] h-full flex items-center p-1">
                    <DropdownMenu>
                        <DropdownMenuTrigger className="text-foreground hover:text-foreground-hover hover:bg-foreground/5 p-1 rounded h-full w-full flex items-center justify-center px-3">
                            <Icons.DotsHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem>Close Tab</DropdownMenuItem>
                            <DropdownMenuItem>Close Other Tabs</DropdownMenuItem>
                            <DropdownMenuItem>Close All Tabs</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Main content area */}
            <div className="flex-1 h-full"></div>
        </div>
    );
});

export default DevTab;

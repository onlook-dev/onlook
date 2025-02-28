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

interface FileTabProps {
    filename: string;
}

const FileTab: React.FC<FileTabProps> = ({ filename }) => {
    return (
        <div className="h-full px-4 relative">
            <div className="absolute right-0 h-[50%] w-[0.5px] bg-foreground/10 top-1/2 -translate-y-1/2"></div>
            <div className="text-foreground text-sm h-full flex items-center">{filename}</div>
        </div>
    );
};

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
                <div className="flex items-center space-x-5 h-full">
                    <DropdownMenu>
                        <DropdownMenuTrigger className="flex items-center text-foreground text-sm hover:text-foreground-hover h-full">
                            <Icons.Sparkles className="mr-1.5 h-4 w-4" />
                            <span className="mr-1">Edit Code</span>
                            <Icons.ChevronDown className="h-3 w-3" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="-mt-1">
                            <DropdownMenuItem>Jump to code from canvas</DropdownMenuItem>
                            <DropdownMenuItem>Editor setting here</DropdownMenuItem>
                            <DropdownMenuItem>Editor setting here</DropdownMenuItem>
                            <DropdownMenuItem>Editor setting here</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                        <DropdownMenuTrigger className="flex items-center text-foreground text-sm hover:text-foreground-hover h-full">
                            <Icons.Directory className="mr-1.5 h-4 w-4" />
                            <span className="mr-1">Files</span>
                            <Icons.ChevronDown className="h-3 w-3" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="-mt-1">
                            <div className="h-[250px] w-[200px] overflow-auto p-1"></div>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <button className="text-foreground hover:text-foreground-hover">
                    <Icons.CrossS className="h-4 w-4" />
                </button>
            </div>

            {/* Second Bar with index.tsx and three dots menu */}
            <div className="flex items-center justify-between h-10 border-b-[0.5px]">
                <div className="flex items-center h-full">
                    <FileTab filename="Index.tsx" />
                </div>

                <div className="border-l-[0.5px] h-full flex items-center p-1">
                    <DropdownMenu>
                        <DropdownMenuTrigger className="text-foreground hover:text-foreground-hover hover:bg-foreground/5 p-1 rounded h-full w-full flex items-center justify-center px-3">
                            <Icons.DotsHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="-mt-1">
                            <DropdownMenuItem>index.tsx</DropdownMenuItem>
                            <DropdownMenuItem>ChatInput.tsx</DropdownMenuItem>
                            <DropdownMenuItem>PageTree.tsx</DropdownMenuItem>
                            <DropdownMenuItem>ComponentModal.tsx</DropdownMenuItem>
                            <DropdownMenuItem>PageNode.tsx</DropdownMenuItem>
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

import { useEditorEngine, useProjectsManager, useUserManager } from '@/components/Context';
import { SettingsTabValue } from '@/lib/models';
import type { DomElement } from '@onlook/models/element';
import { DEFAULT_IDE } from '@onlook/models/ide';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '@onlook/ui/tooltip';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { IDE } from '/common/ide';

const OpenCodeMini = observer(() => {
    const editorEngine = useEditorEngine();
    const projectsManager = useProjectsManager();
    const userManager = useUserManager();

    const [folderPath, setFolder] = useState<string | null>(null);
    const [instance, setInstance] = useState<string | null>(null);
    const [root, setRoot] = useState<string | null>(null);
    const ide = IDE.fromType(userManager.settings.settings?.editor?.ideType || DEFAULT_IDE);

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isFolderHovered, setIsFolderHovered] = useState(false);

    const IDEIcon = Icons[ide.icon];

    useEffect(() => {
        if (projectsManager.project) {
            const folder = projectsManager.project.folderPath;
            setFolder(folder);
        }
    }, []);

    useEffect(() => {
        updateInstanceAndRoot();
    }, [editorEngine.elements.selected]);

    async function updateInstanceAndRoot() {
        if (editorEngine.elements.selected.length > 0) {
            const element: DomElement = editorEngine.elements.selected[0];
            setInstance(element.instanceId);
            setRoot(element.oid);
        } else {
            setInstance(null);
            setRoot(null);
        }
    }

    return (
        <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                        <button
                            className="w-16 h-14 rounded-xl text-small flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:text-foreground"
                            disabled={!instance && !root && !folderPath}
                        >
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={ide.type}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 1.2 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <IDEIcon className="w-4 h-4 overflow-visible" />
                                </motion.div>
                            </AnimatePresence>
                        </button>
                    </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipPortal>
                    <TooltipContent
                        side="left"
                        sideOffset={5}
                        className={cn(isDropdownOpen && 'invisible')}
                    >
                        <p>
                            Open {instance || root ? 'selected element' : 'folder'} in{' '}
                            {ide.displayName}
                        </p>
                    </TooltipContent>
                </TooltipPortal>
            </Tooltip>
            <DropdownMenuContent
                align="end"
                side="left"
                alignOffset={55}
                sideOffset={-55}
                className="w-64"
            >
                <DropdownMenuItem
                    className="text-sm"
                    onClick={() => {
                        editorEngine.settingsTab = SettingsTabValue.PREFERENCES;
                        editorEngine.isSettingsOpen = true;
                    }}
                >
                    <Icons.Gear className="mr-2 w-4 h-4" />
                    Change IDE
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                    className="text-sm"
                    onClick={() => {
                        editorEngine.code.viewSourceFile(folderPath);
                    }}
                    onMouseEnter={() => setIsFolderHovered(true)}
                    onMouseLeave={() => setIsFolderHovered(false)}
                >
                    {isFolderHovered ? (
                        <Icons.DirectoryOpen className="mr-2 w-4 h-4" />
                    ) : (
                        <Icons.Directory className="mr-2 w-4 h-4" />
                    )}
                    Open Project Folder in {ide.displayName}
                </DropdownMenuItem>
                {instance && (
                    <DropdownMenuItem
                        className="text-sm"
                        onClick={() => {
                            editorEngine.code.viewSource(instance);
                        }}
                    >
                        <Icons.ComponentInstance className="mr-2 w-4 h-4" />
                        Locate Instance Code
                    </DropdownMenuItem>
                )}
                {root && (
                    <DropdownMenuItem
                        className="text-sm"
                        onClick={() => {
                            editorEngine.code.viewSource(root);
                        }}
                    >
                        {instance ? (
                            <Icons.Component className="mr-2 w-4 h-4" />
                        ) : (
                            <Icons.Code className="mr-2 w-4 h-4" />
                        )}
                        Locate {instance ? 'Component' : 'Element'} Code
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
});

export default OpenCodeMini;

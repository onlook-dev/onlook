import { useEditorEngine, useProjectsManager, useUserManager } from '@/components/Context';
import { invokeMainChannel } from '@/lib/utils';
import { MainChannels } from '@onlook/models/constants';
import { DEFAULT_IDE, IdeType } from '@onlook/models/ide';
import { IDE } from '/common/ide';
import { Icons } from '@onlook/ui/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { observer } from 'mobx-react-lite';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@onlook/ui/dropdown-menu';
import { cn } from '@onlook/ui/utils';
import { TabValue } from '../../TopBar/ProjectSelect/SettingsModal';

const OpenCodeMini = observer(() => {
    const editorEngine = useEditorEngine();
    const projectsManager = useProjectsManager();
    const userManager = useUserManager();

    const [folderPath, setFolder] = useState<string | null>(null);
    const [instance, setInstance] = useState<string | null>(null);
    const [root, setRoot] = useState<string | null>(null);
    const [ide, setIde] = useState<IDE>(IDE.fromType(DEFAULT_IDE));
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isFolderHovered, setIsFolderHovered] = useState(false);
    const [coreElementType, setCoreElementType] = useState<string | null>(null);

    const IDEIcon = Icons[ide.icon as keyof typeof Icons];

    useEffect(() => {
        if (projectsManager.project) {
            const folder = projectsManager.project.folderPath;
            setFolder(folder);
        }
    }, []);

    useEffect(() => {
        async function getIdeType() {
            const settings = await invokeMainChannel(MainChannels.GET_USER_SETTINGS);
            const ideType = (settings as { ideType?: IdeType })?.ideType || DEFAULT_IDE;
            setIde(IDE.fromType(ideType));
        }
        getIdeType();
    }, [userManager.settings]);

    useEffect(() => {
        updateInstanceAndRoot();
    }, [editorEngine.elements.selected]);

    async function updateInstanceAndRoot() {
        if (editorEngine.elements.selected.length > 0) {
            const element = editorEngine.elements.selected[0];
            setInstance(element.instanceId);
            setRoot(element.oid);
            const { coreType } = await editorEngine.webviews.selected[0].executeJavaScript(
                `window.api?.getElementType('${element.domId}')`
            );
            setCoreElementType(coreType);
        } else {
            setInstance(null);
            setRoot(null);
            setCoreElementType(null);
        }
    }

    const handleClick = () => {
        if (folderPath) {
            editorEngine.code.viewSourceFile(folderPath);
        } else {
            editorEngine.code.viewSource(instance || root || null);
        }
    };

    return (
        <>
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
                    <TooltipContent side="left" sideOffset={5} className={cn(isDropdownOpen && 'invisible')}>
                        <p>Open {instance || root ? 'selected element' : 'folder'} in {ide.displayName}</p>
                    </TooltipContent>
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
                            setIsDropdownOpen(false);
                            editorEngine.settingsTab = TabValue.PREFERENCES;
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
                            setIsDropdownOpen(false);
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
                        Open Project File in {ide.displayName}
                    </DropdownMenuItem>
                    {instance && (
                        <DropdownMenuItem
                            className="text-sm"
                            onClick={() => {
                                setIsDropdownOpen(false);
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
                                setIsDropdownOpen(false);
                                editorEngine.code.viewSource(root);
                            }}
                        >
                            {coreElementType === 'component-root' ? (
                                <Icons.Component className="mr-2 w-4 h-4" />
                            ) : (
                                <Icons.Code className="mr-2 w-4 h-4" />
                            )}
                            Locate {coreElementType === 'component-root' ? 'Component' : 'Element'} Code
                        </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
        </>
    );
});

export default OpenCodeMini;

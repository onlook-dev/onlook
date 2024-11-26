import { useEditorEngine, useProjectsManager } from '@/components/Context';
import { invokeMainChannel } from '@/lib/utils';
import { MainChannels } from '@onlook/models/constants';
import type { DomElement } from '@onlook/models/element';
import { IdeType } from '@onlook/models/ide';
import type { UserSettings } from '@onlook/models/settings';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { cn } from '@onlook/ui/utils';
import { AnimatePresence, motion, useAnimate } from 'framer-motion';
import { observer } from 'mobx-react-lite';
import { useEffect, useMemo, useState } from 'react';
import { IDE } from '/common/ide';

const OpenCode = observer(() => {
    const editorEngine = useEditorEngine();
    const projectManager = useProjectsManager();

    const [folderPath, setFolder] = useState<string | null>(null);
    const [instance, setInstance] = useState<string | null>(null);
    const [root, setRoot] = useState<string | null>(null);
    const [ide, setIde] = useState<IDE>(IDE.VS_CODE);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isFolderHovered, setIsFolderHovered] = useState(false);
    const [scopeDropdownIcon, animateDropdownIcon] = useAnimate();

    const IDEIcon = Icons[ide.icon];

    useEffect(() => {
        if (projectManager.project) {
            const folder = projectManager.project.folderPath;
            setFolder(folder);
        }
    }, []);

    useEffect(() => {
        invokeMainChannel(MainChannels.GET_USER_SETTINGS).then((res) => {
            const settings: UserSettings = res as UserSettings;
            setIde(IDE.fromType(settings.ideType || IdeType.VS_CODE));
        });
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

    function viewSource(oid: string | null) {
        editorEngine.code.viewSource(oid);
    }

    function viewSourceFile(filePath: string | null) {
        editorEngine.code.viewSourceFile(filePath);
    }

    function updateIde(newIde: IDE) {
        invokeMainChannel(MainChannels.UPDATE_USER_SETTINGS, { ideType: newIde.type });
        setIde(newIde);
    }

    const ideCharacters = useMemo(() => {
        const prefixChars = 'Open in '.split('').map((ch, index) => ({
            id: `prefix_${index}`,
            label: ch === ' ' ? '\u00A0' : ch,
        }));
        const entities = `${ide}`.split('').map((ch) => ch);
        const characters: { label: string; id: string }[] = [];

        for (let index = 0; index < entities.length; index++) {
            const entity = entities[index];
            const count = entities.slice(0, index).filter((e) => e === entity).length;

            characters.push({
                id: `${entity}${count + 1}`,
                label: characters.length === 0 ? entity.toUpperCase() : entity,
            });
        }

        return [...prefixChars, ...characters];
    }, [`${ide}`]);

    function handleIDEDropdownOpenChange(isOpen: boolean) {
        setIsDropdownOpen(isOpen);
        animateDropdownIcon(
            scopeDropdownIcon.current,
            { rotate: isOpen ? 30 : 0 },
            { duration: 0.4 },
        );
    }

    return (
        <div className="inline-flex items-center justify-center whitespace-nowrap overflow-hidden rounded-md font-medium transition-colors focus-visible:outline-none h-8 border border-input shadow-sm bg-background hover:bg-background-onlook hover:text-accent-foreground text-xs space-x-0 p-0">
            <Tooltip>
                <TooltipTrigger asChild>
                    <div>
                        <DropdownMenu onOpenChange={(isOpen) => setIsDropdownOpen(isOpen)}>
                            <DropdownMenuTrigger
                                className="flex flex-row items-center"
                                asChild
                                disabled={!instance && !root}
                            >
                                <button
                                    className="flex items-center text-smallPlus justify-center disabled:text-foreground-onlook h-8 px-2.5 rounded-l-md hover:text-foreground-active/90 transition-all duration-300 ease-in-out"
                                    disabled={!folderPath && !instance && !root}
                                    onClick={() => {
                                        if (folderPath) {
                                            viewSourceFile(folderPath);
                                        } else {
                                            viewSource(instance || root || null);
                                        }
                                    }}
                                >
                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={ide.type}
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 1.2 }}
                                            transition={{ duration: 0.2 }}
                                            className="relative"
                                        >
                                            <IDEIcon className="text-default h-3 w-3 mr-2 ml-1 flex-shrink-0" />
                                        </motion.div>
                                    </AnimatePresence>
                                    <span className="text-xs">
                                        <AnimatePresence mode="popLayout">
                                            {ideCharacters.map((character) => (
                                                <motion.span
                                                    key={character.id}
                                                    layoutId={character.id}
                                                    layout="position"
                                                    className="inline-block"
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    transition={{
                                                        type: 'spring',
                                                        bounce: 0.1,
                                                        duration: 0.4,
                                                    }}
                                                >
                                                    {character.label}
                                                </motion.span>
                                            ))}
                                        </AnimatePresence>
                                    </span>
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem
                                    className="text-xs"
                                    onSelect={() => {
                                        viewSource(folderPath);
                                    }}
                                    onMouseEnter={() => setIsFolderHovered(true)}
                                    onMouseLeave={() => setIsFolderHovered(false)}
                                >
                                    {isFolderHovered ? (
                                        <Icons.DirectoryOpen className="mr-2 w-3 h-3" />
                                    ) : (
                                        <Icons.Directory className="mr-2 w-3 h-3" />
                                    )}
                                    Folder
                                </DropdownMenuItem>
                                {instance && (
                                    <DropdownMenuItem
                                        className="text-xs"
                                        onSelect={() => {
                                            viewSource(instance);
                                        }}
                                    >
                                        <Icons.ComponentInstance className="mr-2 w-3 h-3" />
                                        Instance
                                    </DropdownMenuItem>
                                )}
                                {root && (
                                    <DropdownMenuItem
                                        className="text-xs"
                                        onSelect={() => {
                                            viewSource(root);
                                        }}
                                    >
                                        <Icons.Code className="mr-2 w-3 h-3" />
                                        Element
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className={cn('mt-3', isDropdownOpen && 'invisible')}>
                    <p>Open {instance || root ? 'selected element' : 'folder'} in IDE</p>
                </TooltipContent>
            </Tooltip>

            <Tooltip>
                <TooltipTrigger asChild>
                    <div>
                        <DropdownMenu onOpenChange={handleIDEDropdownOpenChange}>
                            <DropdownMenuTrigger asChild>
                                <button
                                    className="text-foreground-active bg-transperant hover:text-foreground-active/90 w-8 h-8 flex items-center justify-center"
                                    onClick={() => viewSource(instance || root)}
                                >
                                    <Icons.Gear ref={scopeDropdownIcon} />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                {IDE.getAll().map((item) => {
                                    const ItemIcon = Icons[item.icon];
                                    return (
                                        <DropdownMenuItem
                                            key={item.displayName}
                                            className="text-xs"
                                            onSelect={() => {
                                                updateIde(item);
                                            }}
                                        >
                                            <ItemIcon className="text-default h-3 w-3 mr-2" />
                                            <span>{item.displayName}</span>
                                            {ide === item && (
                                                <Icons.CheckCircled className="ml-auto" />
                                            )}
                                        </DropdownMenuItem>
                                    );
                                })}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className={cn('mt-0', isDropdownOpen && 'invisible')}>
                    <p>Change which IDE you use</p>
                </TooltipContent>
            </Tooltip>
        </div>
    );
});

export default OpenCode;

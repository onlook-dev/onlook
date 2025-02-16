import { useEditorEngine, useProjectsManager, useUserManager } from '@/components/Context';
import type { DomElement } from '@onlook/models/element';
import { DEFAULT_IDE } from '@onlook/models/ide';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { AnimatePresence, motion, useAnimate } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { IDE } from '/common/ide';

const OpenCode = observer(() => {
    const editorEngine = useEditorEngine();
    const projectsManager = useProjectsManager();
    const userManager = useUserManager();

    const [folderPath, setFolder] = useState<string | null>(null);
    const [instance, setInstance] = useState<string | null>(null);
    const [root, setRoot] = useState<string | null>(null);
    const [ide, setIde] = useState<IDE>(
        IDE.fromType(userManager.settings.settings?.editor?.ideType || DEFAULT_IDE),
    );
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isFolderHovered, setIsFolderHovered] = useState(false);
    const [scopeDropdownIcon, animateDropdownIcon] = useAnimate();

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

    function viewSource(oid: string | null) {
        editorEngine.code.viewSource(oid);
    }

    function viewSourceFile(filePath: string | null) {
        editorEngine.code.viewSourceFile(filePath);
    }

    function updateIde(newIde: IDE) {
        userManager.settings.updateEditor({ ideType: newIde.type });
        setIde(newIde);
    }

    const ideCharacters = useMemo(() => {
        const prefixChars = 'Open in '.split('').map((ch, index) => ({
            id: `opencode_prefix_${index}`,
            label: ch === ' ' ? '\u00A0' : ch,
        }));
        const entities = `${ide}`.split('').map((ch) => ch);
        const characters: { label: string; id: string }[] = [];

        for (let index = 0; index < entities.length; index++) {
            const entity = entities[index];
            const count = entities.slice(0, index).filter((e) => e === entity).length;

            characters.push({
                id: `opencode_${entity}${count + 1}`,
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
        <div className="inline-flex items-center justify-center whitespace-nowrap overflow-hidden rounded-md transition-colors focus-visible:outline-none h-8 border border-input shadow-sm bg-background hover:bg-background-onlook hover:text-foreground-active/90 hover:border-foreground-active/30 text-xs space-x-0 p-0 mr-1">
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
                                        viewSourceFile(folderPath);
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

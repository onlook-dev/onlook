import { useEditorEngine, useProjectsManager } from '@/components/Context';
import { Icons } from '@/components/icons';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import clsx from 'clsx';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { MainChannels } from '/common/constants';
import { IDE, IdeType } from '/common/ide';
import { WebViewElement } from '/common/models/element';
import { TemplateNode } from '/common/models/element/templateNode';
import { UserSettings } from '/common/models/settings';

const OpenCode = observer(() => {
    const editorEngine = useEditorEngine();
    const projectManager = useProjectsManager();

    const [folder, setFolder] = useState<TemplateNode | undefined>();
    const [instance, setInstance] = useState<TemplateNode | undefined>();
    const [root, setRoot] = useState<TemplateNode | undefined>();
    const [ide, setIde] = useState<IDE>(IDE.VS_CODE);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const IDEIcon = Icons[ide.icon];

    useEffect(() => {
        if (projectManager.project) {
            const folder = projectManager.project.folderPath;
            const folderTemplateNode: TemplateNode = {
                path: folder,
                startTag: { start: { line: 0, column: 0 }, end: { line: 0, column: 0 } },
            };
            setFolder(folderTemplateNode);
        }
    }, []);

    useEffect(() => {
        window.api.invoke(MainChannels.GET_USER_SETTINGS).then((res) => {
            const settings: UserSettings = res as UserSettings;
            setIde(IDE.fromType(settings.ideType || IdeType.VS_CODE));
        });
    }, []);

    useEffect(() => {
        if (editorEngine.elements.selected.length > 0) {
            const element: WebViewElement = editorEngine.elements.selected[0];
            setInstance(editorEngine.ast.getInstance(element.selector));
            setRoot(editorEngine.ast.getRoot(element.selector));
        } else {
            setInstance(undefined);
            setRoot(undefined);
        }
    }, [editorEngine.elements.selected]);

    function viewSource(templateNode?: TemplateNode) {
        editorEngine.code.viewSource(templateNode);
    }

    function updateIde(ide: IDE) {
        window.api.invoke(MainChannels.UPDATE_USER_SETTINGS, { ideType: ide.type });
        setIde(ide);
    }

    return (
        <div className="inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium transition-colors focus-visible:outline-none h-8 border border-input shadow-sm bg-background hover:bg-background-onlook hover:text-accent-foreground text-xs space-x-0 p-0">
            <Tooltip>
                <TooltipTrigger asChild>
                    <div>
                        <DropdownMenu onOpenChange={(isOpen) => setIsDropdownOpen(isOpen)}>
                            <DropdownMenuTrigger
                                className="flex flex-row items-center mr-2"
                                asChild
                                disabled={!instance && !root}
                            >
                                <button
                                    className="flex items-center text-smallPlus justify-center disabled:text-foreground-onlook h-full w-full min-w-[7.5rem] my-1 pl-2.5 hover:text-foreground-active/90"
                                    disabled={!folder && !instance && !root}
                                    onClick={() => viewSource(folder || instance || root)}
                                >
                                    <IDEIcon className="text-default h-3 w-3 mr-2" />
                                    <span className="text-xs">{`Open in ${ide}`}</span>
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem
                                    className="text-xs"
                                    onSelect={() => {
                                        viewSource(folder);
                                    }}
                                >
                                    <Icons.File className="mr-2 w-3 h-3" />
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
                                        <Icons.Component className="mr-2 w-3 h-3" />
                                        Component
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </TooltipTrigger>
                <TooltipContent
                    side="bottom"
                    className={clsx('mt-3', isDropdownOpen && 'invisible')}
                >
                    <p>Open {instance || root ? 'selected element' : 'folder'} in IDE</p>
                </TooltipContent>
            </Tooltip>

            <Tooltip>
                <TooltipTrigger asChild>
                    <div>
                        <DropdownMenu onOpenChange={(isOpen) => setIsDropdownOpen(isOpen)}>
                            <DropdownMenuTrigger asChild className="p-2">
                                <button
                                    className="text-foreground-active bg-transperant hover:text-foreground-active/90 w-8 h-8 m-2 mr-1 flex items-center justify-center"
                                    onClick={() => viewSource(instance || root)}
                                >
                                    <Icons.Gear />
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
                <TooltipContent
                    side="bottom"
                    className={clsx('mt-0', isDropdownOpen && 'invisible')}
                >
                    <p>Change which IDE you use</p>
                </TooltipContent>
            </Tooltip>
        </div>
    );
});

export default OpenCode;

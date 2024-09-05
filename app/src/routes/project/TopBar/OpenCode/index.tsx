import CursorIcon from '@/assets/cursor.svg';
import VsCodeIcon from '@/assets/vscode.svg';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import {
    CheckCircledIcon,
    Component1Icon,
    ComponentInstanceIcon,
    GearIcon,
} from '@radix-ui/react-icons';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { useEditorEngine } from '../..';
import { MainChannels } from '/common/constants';
import { IDE, IdeType } from '/common/ide';
import { WebViewElement } from '/common/models/element';
import { TemplateNode } from '/common/models/element/templateNode';
import { UserSettings } from '/common/models/settings';

const OpenCode = observer(() => {
    const editorEngine = useEditorEngine();
    const [instance, setInstance] = useState<TemplateNode | undefined>();
    const [root, setRoot] = useState<TemplateNode | undefined>();
    const [ide, setIde] = useState<IDE>(IDE.VS_CODE);

    useEffect(() => {
        window.api.invoke(MainChannels.GET_USER_SETTINGS).then((res) => {
            const settings: UserSettings = res as UserSettings;
            setIde(IDE.fromType(settings.ideType || IdeType.VS_CODE));
        });
    }, []);

    useEffect(() => {
        if (editorEngine.elements.selected.length > 0) {
            const element: WebViewElement = editorEngine.elements.selected[0];
            editorEngine.ast.getInstance(element.selector).then((instance) => {
                setInstance(instance);
            });
            editorEngine.ast.getRoot(element.selector).then((root) => {
                setRoot(root);
            });
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
        <div
            aria-disabled={!instance && !root}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium transition-colors focus-visible:outline-none h-8 border border-input shadow-sm bg-background hover:bg-bg hover:text-accent-foreground text-xs space-x-2 p-0 px-2"
        >
            <DropdownMenu>
                <DropdownMenuTrigger
                    className="flex flex-row items-center p-0"
                    asChild
                    disabled={!instance}
                >
                    <button
                        className="flex items-center justify-center disabled:text-text-disabled h-full w-full min-w-[7.5rem] my-2 hover:text-text-active/90"
                        disabled={!instance && !root}
                        onClick={() => viewSource(instance || root)}
                    >
                        <span className="text-default h-3 w-3 mr-2">
                            <img
                                src={ide === IDE.VS_CODE ? VsCodeIcon : CursorIcon}
                                alt={`${ide} Icon`}
                            />
                        </span>
                        <span>{`Open in ${ide}`}</span>
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem
                        className="text-xs"
                        onSelect={() => {
                            viewSource(instance);
                        }}
                    >
                        <ComponentInstanceIcon className="mr-2 w-3 h-3" />
                        Instance
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        className="text-xs"
                        onSelect={() => {
                            viewSource(root);
                        }}
                    >
                        <Component1Icon className="mr-2 w-3 h-3" />
                        Component
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            <Separator orientation="vertical" className="h-6" />
            <DropdownMenu>
                <DropdownMenuTrigger asChild className="p-0">
                    <button
                        className="text-text-active hover:text-text-active/90 w-8 h-8 m-2 flex items-center justify-center"
                        onClick={() => viewSource(instance || root)}
                    >
                        <GearIcon />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    {IDE.getAll().map((item) => (
                        <DropdownMenuItem
                            key={item.displayName}
                            className="text-xs"
                            onSelect={() => {
                                updateIde(item);
                            }}
                        >
                            <span className="text-default h-3 w-3 mr-2">
                                <img
                                    src={item === IDE.VS_CODE ? VsCodeIcon : CursorIcon}
                                    alt={`${item} Icon`}
                                />
                            </span>
                            <span>{item.displayName}</span>
                            {ide === item && <CheckCircledIcon className="ml-auto" />}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
});

export default OpenCode;

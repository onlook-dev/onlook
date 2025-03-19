import { useEditorEngine } from '@/components/Context';
import { MainChannels } from '@onlook/models/constants';
import { Button } from '@onlook/ui/button';
import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactComponentDescriptor } from '/electron/main/code/components';
import { invokeMainChannel } from '@/lib/utils';
import { Icons } from '@onlook/ui/icons/index';
import { Input } from '@onlook/ui/input';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { CREATE_NEW_COMPONENT } from '@/lib/editor/engine/projectinfo';
import { LeftTabValue } from '@/lib/models';

function ScanComponentsButton() {
    const editorEngine = useEditorEngine();

    const onClick = useCallback(async () => {
        const path = (await invokeMainChannel(MainChannels.PICK_COMPONENTS_DIRECTORY)) as
            | string
            | null;

        if (path == null) {
            return;
        }

        const components = (await invokeMainChannel(
            MainChannels.GET_COMPONENTS,
            path,
        )) as ReactComponentDescriptor[];
        editorEngine.projectInfo.components = components;
    }, [editorEngine]);

    return (
        <Button variant="outline" size="sm" className="" onClick={onClick}>
            Connect to Project
        </Button>
    );
}

const ComponentsTab = observer(({ components }: { components: ReactComponentDescriptor[] }) => {
    const editorEngine = useEditorEngine();
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [renameVal, setRenameVal] = useState<string>('');
    const [isCreateAction, setIsCreateAction] = useState<boolean>(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editorEngine.componentPanelTab !== LeftTabValue.COMPONENTS) {
            editorEngine.projectInfo.scanComponents();
        }
    }, []);

    useEffect(() => {
        const createHandler = () => {
            setIsCreateAction(true);
        };

        window.addEventListener(CREATE_NEW_COMPONENT, createHandler);
        return () => window.removeEventListener(CREATE_NEW_COMPONENT, createHandler);
    }, []);

    useEffect(() => {
        if ((editingIndex !== null || isCreateAction) && inputRef.current) {
            setTimeout(() => {
                if (inputRef.current) {
                    inputRef.current.focus();
                    inputRef.current.select();
                }
            }, 200);
        }
    }, [editingIndex, isCreateAction]);

    const handleDelete = async (filePath: string) => {
        try {
            await editorEngine.projectInfo.deleteComponent(filePath);
        } catch (error) {
            console.error('Failed to duplicate page:', error);
        }
    };

    const handleRename = (index: number) => {
        setEditingIndex(index);
    };

    const handleDuplicate = async (filePath: string, componentName: string) => {
        try {
            await editorEngine.projectInfo.duplicateComponent(filePath, componentName);
        } catch (error) {
            console.error('Failed to duplicate page:', error);
        }
    };

    const handleKeyDown = async (e: React.KeyboardEvent, filePath: string) => {
        if (e.key === 'Enter') {
            setEditingIndex(null);
            if (isCreateAction) {
                const element = editorEngine.elements.selected[0];
                if (renameVal) {
                    await editorEngine.projectInfo.createComponent(renameVal, element.oid || '');
                }
            } else {
                if (renameVal) {
                    await editorEngine.projectInfo.renameComponent(renameVal, filePath);
                }
            }
            setRenameVal('');
            setIsCreateAction(false);
        } else if (e.key === 'Escape') {
            setEditingIndex(null);
            setRenameVal('');
            setIsCreateAction(false);
        }
    };

    const handleBlur = async () => {
        setEditingIndex(null);
        setRenameVal('');
        setIsCreateAction(false);
        await editorEngine.projectInfo.scanComponents();
    };

    return (
        <div className="w-full pt-4">
            {components.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center">
                    <ScanComponentsButton />
                </div>
            ) : (
                components.map((component, index) => (
                    <div
                        className="flex-col cursor-pointer"
                        key={`${component.name}-${component.sourceFilePath}`}
                    >
                        <div
                            className={
                                'flex items-center px-2 text-nav-item transition-colors duration-200 relative group'
                            }
                        >
                            <div
                                className={`flex items-center justify-between w-full p-2 rounded-md text-gray-300 hover:bg-background-secondary hover:text-foreground ${
                                    (editingIndex === index || !component.name) &&
                                    'bg-background-secondary'
                                }`}
                            >
                                <div className="flex space-x-3">
                                    <Icons.Component className="w-4 h-5 text-gray-300" />
                                    {editingIndex === index || !component.name ? (
                                        <Input
                                            ref={inputRef}
                                            value={renameVal}
                                            onChange={(e) => setRenameVal(e.target.value)}
                                            onKeyDown={(e) =>
                                                handleKeyDown(e, component.sourceFilePath)
                                            }
                                            onBlur={handleBlur}
                                            placeholder={component.name || 'Untitled component'}
                                            className="bg-transparent border-none text-white h-5 px-0 focus-visible:bg-transparent placeholder:text-gray-500"
                                        />
                                    ) : (
                                        <span className="text-sm font-medium">
                                            {component.name}
                                        </span>
                                    )}
                                </div>
                                <div
                                    className={`top-2 ${
                                        activeDropdown === component.name
                                            ? 'opacity-100'
                                            : 'opacity-0'
                                    } group-hover:opacity-100 transition-opacity duration-300`}
                                >
                                    <DropdownMenu
                                        onOpenChange={(isOpen) =>
                                            setActiveDropdown(isOpen ? component.name : null)
                                        }
                                    >
                                        <DropdownMenuTrigger>
                                            <Button
                                                variant={'ghost'}
                                                className="bg-background p-1 inline-flex items-center justify-center h-auto w-auto rounded shadow-sm"
                                            >
                                                <Icons.DotsHorizontal className="text-foreground dark:text-white w-4 h-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent
                                            className="rounded-md bg-background"
                                            align="start"
                                            side="right"
                                        >
                                            <DropdownMenuItem asChild>
                                                <Button
                                                    onClick={() => handleRename(index)}
                                                    variant={'ghost'}
                                                    className="hover:bg-background-secondary focus:bg-background-secondary w-full rounded-sm group"
                                                >
                                                    <span className="flex w-full text-smallPlus items-center">
                                                        <Icons.Pencil className="mr-2 h-4 w-4 text-foreground-secondary group-hover:text-foreground-active" />
                                                        <span>Rename</span>
                                                    </span>
                                                </Button>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem asChild>
                                                <Button
                                                    onClick={() =>
                                                        handleDuplicate(
                                                            component.sourceFilePath,
                                                            component.name,
                                                        )
                                                    }
                                                    variant={'ghost'}
                                                    className="hover:bg-background-secondary focus:bg-background-secondary w-full rounded-sm group"
                                                >
                                                    <span className="flex w-full text-smallPlus items-center">
                                                        <Icons.Copy className="mr-2 h-4 w-4 text-foreground-secondary group-hover:text-foreground-active" />
                                                        <span>Duplicate</span>
                                                    </span>
                                                </Button>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem asChild>
                                                <Button
                                                    variant={'ghost'}
                                                    className={`group hover:bg-background-secondary focus:bg-background-secondary w-full rounded-sm group ${!component.isDelete && 'cursor-not-allowed'}`}
                                                    disabled={!component.isDelete}
                                                    onClick={() =>
                                                        handleDelete(component.sourceFilePath)
                                                    }
                                                >
                                                    <span className="flex w-full text-smallPlus items-center">
                                                        <Icons.Trash className="mr-2 h-4 w-4 text-foreground-secondary group-hover:text-foreground-active" />
                                                        <span>Delete</span>
                                                    </span>
                                                </Button>
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
});

export default ComponentsTab;

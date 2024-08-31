import CursorIcon from '@/assets/cursor.svg';
import VsCodeIcon from '@/assets/vscode.svg';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Component1Icon, ComponentInstanceIcon } from '@radix-ui/react-icons';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { useEditorEngine } from '../..';

import { IDE } from '/common/models';
import { WebViewElement } from '/common/models/element';
import { TemplateNode } from '/common/models/element/templateNode';

const OpenCode = observer(() => {
    const editorEngine = useEditorEngine();
    const [instance, setInstance] = useState<TemplateNode | undefined>();
    const [root, setRoot] = useState<TemplateNode | undefined>();
    const [ide, setIde] = useState<IDE>(IDE.CURSOR);

    useEffect(() => {
        if (editorEngine.elements.selected.length > 0) {
            const element: WebViewElement = editorEngine.elements.selected[0];
            editorEngine.ast.getInstance(element.selector).then((instance) => {
                setInstance(instance);
            });
            editorEngine.ast.getRoot(element.selector).then((root) => {
                setRoot(root);
            });
        }
    }, [editorEngine.elements.selected]);

    function viewSource(templateNode?: TemplateNode) {
        editorEngine.code.viewSource(templateNode);
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild disabled={!instance}>
                <Button
                    disabled={!instance && !root}
                    variant="outline"
                    size="sm"
                    className=""
                    onClick={() => viewSource(instance || root)}
                >
                    <span className="text-default h-3 w-3 mr-2">
                        <img
                            src={ide === IDE.VS_CODE ? VsCodeIcon : CursorIcon}
                            alt={`${ide} Icon`}
                        />
                    </span>
                    <span>{`Open in ${ide}`}</span>
                </Button>
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
    );
});

export default OpenCode;

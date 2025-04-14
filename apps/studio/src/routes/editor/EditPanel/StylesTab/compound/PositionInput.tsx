import { useEditorEngine } from '@/components/Context';
import type { CompoundStyleImpl } from '@/lib/editor/styles';
import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useMemo, useState } from 'react';
import TextInput from '../single/TextInput';
import { cn } from '@onlook/ui/utils';
import SelectInput from '../single/SelectInput';
import { Icons } from '@onlook/ui/icons/index';
import type { DomElement } from '@onlook/models/element';

type Position = 'top' | 'bottom' | 'left' | 'right';
type PositionState = Record<Position, boolean>;

interface LineProps {
    position: Position;
    isActive: boolean;
    onClick: (position: Position) => void;
}

const PositionLine = ({ position, isActive, onClick }: LineProps) => {
    const positionStyles = {
        top: 'top-0.5 w-[calc(100%-16px)] left-[8px]',
        right: 'right-0.5 h-[calc(100%-16px)] top-[8px]',
        bottom: 'bottom-0.5 w-[calc(100%-16px)] left-[8px]',
        left: 'left-0.5 h-[calc(100%-16px)] top-[8px]',
    };

    const lineStyles = {
        top: 'w-1 h-3',
        right: 'h-1 w-3',
        bottom: 'w-1 h-3',
        left: 'h-1 w-3',
    };

    return (
        <div
            className={cn(
                'absolute cursor-pointer transition-colors flex items-center justify-center ',
                positionStyles[position],
            )}
            onClick={() => onClick(position)}
        >
            <div
                className={cn(
                    'rounded-full',
                    lineStyles[position],
                    isActive
                        ? 'bg-red-500 hover:bg-red-600'
                        : 'bg-background-active hover:bg-primary',
                )}
            />
        </div>
    );
};

const CenterButton = ({ isCenter, onClick }: { isCenter: boolean; onClick: () => void }) => (
    <div
        className="bg-background-onlook rounded relative flex items-center justify-center px-2 py-2 border border-background-active"
        onClick={onClick}
    >
        <Icons.Plus
            className={cn(
                'w-4 h-4 hover:text-red-500 transition-colors hover:cursor-pointer hover:scale-110',
                isCenter ? 'text-red-500' : 'text-gray-400',
            )}
        />
    </div>
);

const PositionInput = observer(({ compoundStyle }: { compoundStyle: CompoundStyleImpl }) => {
    const editorEngine = useEditorEngine();
    const [lines, setLines] = useState<PositionState>({
        top: false,
        bottom: false,
        left: false,
        right: false,
    });
    const [isCentered, setIsCentered] = useState(false);

    const resetPositionState = () => {
        setLines({
            top: false,
            bottom: false,
            left: false,
            right: false,
        });
    };

    const onLineClicked = (position: Position) => {
        setLines((prev) => {
            const newState = { ...prev, [position]: !prev[position], center: false };
            if (!newState[position]) {
                editorEngine.style.update(position, 'auto');
            }
            return newState;
        });
    };

    const onMainValueChanged = (key: string, value: string) => {
        editorEngine.history.startTransaction();
        if (value === 'absolute') {
            editorEngine.style.update('position', value);
            editorEngine.history.commitTransaction();

            centerElement();
        } else {
            editorEngine.style.update('position', value);
            editorEngine.history.commitTransaction();

            const updates = Object.fromEntries(
                compoundStyle.children.map((elementStyle) => [elementStyle.key, 'auto']),
            );
            editorEngine.style.updateMultiple(updates);
            resetPositionState();
        }
    };

    const getElementAndParent = async () => {
        const elements = editorEngine.elements.selected;
        if (elements.length === 0) {
            return null;
        }

        const results = [];
        for (const element of elements) {
            if (!element?.domId) {
                continue;
            }

            const webview = editorEngine.webviews.getWebview(element.webviewId);
            if (!webview) {
                continue;
            }

            const parent: DomElement | null = await webview.executeJavaScript(
                `window.api?.getParentElement('${element.domId}')`,
            );
            if (!parent) {
                continue;
            }

            results.push({ element, parent });
        }

        return results.length > 0 ? results : null;
    };

    const centerElement = async () => {
        const elementPairs = await getElementAndParent();
        if (!elementPairs) {
            return;
        }
        if (isCentered) {
            return;
        }

        const updates: Record<string, string> = {};
        for (const { element, parent } of elementPairs) {
            const centerX = (parent.rect.width - element.rect.width) / 2;
            const centerY = (parent.rect.height - element.rect.height) / 2;

            updates.left = `${Math.round(centerX)}px`;
            updates.top = `${Math.round(centerY)}px`;
        }

        editorEngine.style.updateMultiple(updates);
    };

    const checkIfCentered = useCallback(async () => {
        const elementPairs = await getElementAndParent();
        if (!elementPairs) {
            return false;
        }

        const allCentered = elementPairs.every(({ element, parent }) => {
            const centerX = (parent.rect.width - element.rect.width) / 2;
            const centerY = (parent.rect.height - element.rect.height) / 2;
            const currentLeft = element.rect.x - parent.rect.x;
            const currentTop = element.rect.y - parent.rect.y;

            return Math.abs(currentLeft - centerX) < 1 && Math.abs(currentTop - centerY) < 1;
        });

        setIsCentered(allCentered);
        return allCentered;
    }, [editorEngine.style.selectedStyle]);

    const renderMainControl = () => (
        <div className="flex flex-row items-center justify-between w-full">
            <p className="text-xs text-foreground-onlook">{compoundStyle.head.displayName}</p>
            <div className="flex flex-row space-x-1">
                <SelectInput elementStyle={compoundStyle.head} onValueChange={onMainValueChanged} />
            </div>
        </div>
    );

    const renderLines = useCallback(() => {
        return (
            <div className="w-16 h-16 bg-background-onlook rounded relative flex items-center justify-center px-4 py-4">
                <CenterButton isCenter={isCentered} onClick={centerElement} />
                {(['top', 'right', 'bottom', 'left'] as Position[]).map((position) => (
                    <PositionLine
                        key={position}
                        position={position}
                        isActive={lines[position]}
                        onClick={onLineClicked}
                    />
                ))}
            </div>
        );
    }, [lines, centerElement, isCentered]);

    const renderPositionInputs = useCallback(() => {
        const elementStyles = compoundStyle.children;
        const currentPosition = compoundStyle.head.getValue(
            editorEngine.style.selectedStyle?.styles || {},
        );

        if (currentPosition !== 'absolute') {
            return null;
        }

        const positionStyles = {
            top: 'top-0 left-1/2 -translate-x-1/2',
            bottom: 'bottom-0 left-1/2 -translate-x-1/2',
            left: 'left-0 top-1/2 -translate-y-1/2',
            right: 'right-0 top-1/2 -translate-y-1/2',
        };

        return (
            <div className="relative h-36 w-52 flex items-center justify-center mb-4 mx-auto">
                {elementStyles.map((elementStyle) => {
                    const position = elementStyle.key.toLowerCase() as Position;
                    const isActive = lines[position];

                    return (
                        <TextInput
                            key={elementStyle.key}
                            elementStyle={elementStyle}
                            disabled={!isActive}
                            className={cn(
                                'absolute w-16 bg-background-onlook text-foreground-onlook text-center rounded p-2',
                                positionStyles[position],
                                !isActive && 'opacity-50 cursor-not-allowed',
                            )}
                        />
                    );
                })}
                {renderLines()}
            </div>
        );
    }, [compoundStyle.children, editorEngine.style.selectedStyle, lines, renderLines]);

    useEffect(() => {
        const updatePosition = async () => {
            const selectedStyle = editorEngine.style.selectedStyle;
            if (!selectedStyle) {
                return;
            }

            const position = selectedStyle.styles['position'];

            if (position === 'absolute') {
                setLines({
                    top: selectedStyle.styles['top'] !== 'auto',
                    bottom: selectedStyle.styles['bottom'] !== 'auto',
                    left: selectedStyle.styles['left'] !== 'auto',
                    right: selectedStyle.styles['right'] !== 'auto',
                });
            }
        };

        checkIfCentered();
        updatePosition();
    }, [editorEngine.style.selectedStyle]);

    return (
        <div className="space-y-2">
            {renderMainControl()}
            {renderPositionInputs()}
        </div>
    );
});

export default PositionInput;

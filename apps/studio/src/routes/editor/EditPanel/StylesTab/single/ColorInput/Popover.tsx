import { useEditorEngine } from '@/components/Context';
import type { CompoundStyle } from '@/lib/editor/styles/models';
import { Popover, PopoverContent, PopoverTrigger } from '@onlook/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@onlook/ui/tabs';
import { Color } from '@onlook/utility';
import { memo, useEffect, useState } from 'react';
import { isBackgroundImageEmpty } from '.';
import ColorButton from './ColorButton';
import ColorPickerContent from './ColorPicker';
import ImagePickerContent from './ImagePicker';

interface PopoverPickerProps {
    color: Color;
    onChange: (color: Color) => void;
    onChangeEnd: (color: Color) => void;
    backgroundImage?: string;
    compoundStyle?: CompoundStyle;
}

enum TabValue {
    SOLID = 'solid',
    IMAGE = 'image',
}

export const PopoverPicker = memo(
    ({ color, onChange, onChangeEnd, backgroundImage, compoundStyle }: PopoverPickerProps) => {
        const editorEngine = useEditorEngine();
        const [isOpen, toggleOpen] = useState(false);
        const defaultValue =
            backgroundImage && !isBackgroundImageEmpty(backgroundImage)
                ? TabValue.IMAGE
                : TabValue.SOLID;

        useEffect(() => {
            if (isOpen && !editorEngine.history.isInTransaction) {
                editorEngine.history.startTransaction();
                return;
            }

            if (!isOpen && editorEngine.history.isInTransaction) {
                editorEngine.history.commitTransaction();
            }
            return () => editorEngine.history.commitTransaction();
        }, [isOpen]);

        return (
            <Popover onOpenChange={(open) => toggleOpen(open)}>
                <PopoverTrigger>
                    <ColorButton
                        value={color}
                        onClick={() => toggleOpen(!isOpen)}
                        backgroundImage={backgroundImage}
                    />
                </PopoverTrigger>
                <PopoverContent
                    align="end"
                    className="backdrop-blur-lg z-10 rounded-lg p-0 shadow-xl overflow-hidden w-56"
                >
                    {backgroundImage ? (
                        <div>
                            <Tabs defaultValue={defaultValue} className="bg-transparent pb-0 mt-2">
                                <TabsList className="bg-transparent px-2 m-0 gap-2">
                                    <TabsTrigger
                                        value={TabValue.SOLID}
                                        className="bg-transparent text-xs p-1 hover:text-foreground-primary"
                                    >
                                        Solid
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value={TabValue.IMAGE}
                                        className="bg-transparent text-xs p-1 hover:text-foreground-primary"
                                    >
                                        Image
                                    </TabsTrigger>
                                </TabsList>
                                <TabsContent value="solid" className="p-0 m-0">
                                    <ColorPickerContent
                                        color={color}
                                        onChange={onChange}
                                        onChangeEnd={onChangeEnd}
                                    />
                                </TabsContent>
                                <TabsContent value="image" className="p-0 m-0">
                                    <ImagePickerContent
                                        compoundStyle={compoundStyle}
                                        backgroundImage={backgroundImage}
                                    />
                                </TabsContent>
                            </Tabs>
                        </div>
                    ) : (
                        <ColorPickerContent
                            color={color}
                            onChange={onChange}
                            onChangeEnd={onChangeEnd}
                        />
                    )}
                </PopoverContent>
            </Popover>
        );
    },
);

PopoverPicker.displayName = 'PopoverPicker';

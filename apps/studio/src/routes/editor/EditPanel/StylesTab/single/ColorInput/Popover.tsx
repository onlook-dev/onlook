import { useEditorEngine } from '@/components/Context';
import { Popover, PopoverContent, PopoverTrigger } from '@onlook/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@onlook/ui/tabs';
import { Color } from '@onlook/utility';
import { useEffect, useState } from 'react';
import ColorButton from './ColorButton';
import ColorPickerContent from './ColorPicker';
import ImagePickerContent from './ImagePicker';

interface PopoverPickerProps {
    color: Color;
    onChange: (color: Color) => void;
    onChangeEnd: (color: Color) => void;
    isCompound?: boolean;
}

export const PopoverPicker = ({
    color,
    onChange,
    onChangeEnd,
    isCompound = false,
}: PopoverPickerProps) => {
    const editorEngine = useEditorEngine();
    const [isOpen, toggleOpen] = useState(false);

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
                <ColorButton value={color} onClick={() => toggleOpen(!isOpen)} />
            </PopoverTrigger>
            <PopoverContent
                align="end"
                className="backdrop-blur-lg z-10 rounded-lg p-0 shadow-xl overflow-hidden w-56"
            >
                {isCompound ? (
                    <div>
                        <Tabs defaultValue="solid" className="bg-transparent pb-0 mt-2">
                            <TabsList className="bg-transparent px-2 m-0 gap-2">
                                <TabsTrigger
                                    value="solid"
                                    className="bg-transparent text-xs p-1 hover:text-foreground-primary"
                                >
                                    Solid
                                </TabsTrigger>
                                <TabsTrigger
                                    value="image"
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
                                <ImagePickerContent />
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
};

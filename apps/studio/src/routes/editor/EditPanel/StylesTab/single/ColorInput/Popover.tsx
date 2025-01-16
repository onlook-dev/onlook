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
                className="min-w-12 bg-background/90 backdrop-blur-lg z-10 rounded-lg p-0 shadow-xl overflow-hidden"
            >
                {isCompound ? (
                    <Tabs defaultValue="color">
                        <TabsList className="w-full">
                            <TabsTrigger value="color">Color</TabsTrigger>
                            <TabsTrigger value="image">Image</TabsTrigger>
                        </TabsList>
                        <TabsContent value="color">
                            <ColorPickerContent
                                color={color}
                                onChange={onChange}
                                onChangeEnd={onChangeEnd}
                            />
                        </TabsContent>
                        <TabsContent value="image">
                            <ImagePickerContent />
                        </TabsContent>
                    </Tabs>
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

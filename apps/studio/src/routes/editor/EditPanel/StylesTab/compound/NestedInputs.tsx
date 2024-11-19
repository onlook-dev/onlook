import { useEditorEngine } from '@/components/Context';
import type { CompoundStyleImpl } from '@/lib/editor/styles';
import { Icons } from '@onlook/ui/icons';
import { ToggleGroup, ToggleGroupItem } from '@onlook/ui/toggle-group';
import { motion } from 'framer-motion';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import TextInput from '../single/TextInput';

const DISPLAY_NAME_OVERRIDE: Record<string, any> = {
    Top: <Icons.BorderTop className="w-4 h-4" />,
    Bottom: <Icons.BorderBottom className="w-4 h-4" />,
    Right: <Icons.BorderRight className="w-4 h-4" />,
    Left: <Icons.BorderLeft className="w-4 h-4" />,
    'Top Right': <Icons.CornerTopRight className="w-4 h-4" />,
    'Top Left': <Icons.CornerTopLeft className="w-4 h-4" />,
    'Bottom Right': <Icons.CornerBottomRight className="w-4 h-4" />,
    'Bottom Left': <Icons.CornerBottomLeft className="w-4 h-4" />,
};

const NestedInputs = observer(({ compoundStyle }: { compoundStyle: CompoundStyleImpl }) => {
    const editorEngine = useEditorEngine();
    const [showGroup, setShowGroup] = useState(false);

    useEffect(() => {
        const selectedStyle = editorEngine.style.selectedStyle;
        if (!selectedStyle) {
            return;
        }
        setShowGroup(compoundStyle.isHeadSameAsChildren(selectedStyle.styles));
        getOriginalChildrenValues();
    }, [editorEngine.style.selectedStyle]);

    const getOriginalChildrenValues = () => {
        const selectedStyle = editorEngine.style.selectedStyle;
        if (!selectedStyle) {
            return;
        }
    };

    const onTopValueChanged = (key: string, value: string) => {
        overrideChildrenStyles(value);
    };

    const handleToggleGroupChange = (value: 'true' | 'false') => {
        setShowGroup(value === 'true');

        if (value === 'false') {
            const styleRecord = editorEngine.style.selectedStyle;
            if (!styleRecord) {
                return;
            }
            const topValue = compoundStyle.head.getValue(styleRecord.styles);
            const topValueSplit = topValue.split(' ')[0] || '';
            editorEngine.style.update(compoundStyle.head.key, topValueSplit);

            overrideChildrenStyles(topValueSplit);
        }
    };

    const overrideChildrenStyles = (newValue: string) => {
        compoundStyle.children.forEach((elementStyle) => {
            editorEngine.style.updateStyleNoAction(elementStyle.key, newValue);
        });
    };

    function renderTopInput() {
        const elementStyle = compoundStyle.head;
        return (
            <div key={`${elementStyle.key}`} className="flex flex-row items-center col-span-2">
                <p className="text-xs text-left text-foreground-onlook">
                    {elementStyle.displayName}
                </p>
                <div className="ml-auto h-8 flex flex-row w-32 space-x-1">
                    <TextInput elementStyle={elementStyle} onValueChange={onTopValueChanged} />
                    <ToggleGroup
                        size="sm"
                        type="single"
                        value={showGroup ? 'true' : 'false'}
                        onValueChange={handleToggleGroupChange}
                    >
                        <ToggleGroupItem
                            value="false"
                            className="data-[state=on]:bg-background-onlook/75 data-[state=on]:text-foreground-onlook"
                        >
                            <Icons.BorderAll className="w-4 h-5" />
                        </ToggleGroupItem>
                        <ToggleGroupItem
                            value="true"
                            className="data-[state=on]:bg-background-onlook/75 data-[state=on]:text-foreground-onlook"
                        >
                            <Icons.Corners className="w-4 h-5" />
                        </ToggleGroupItem>
                    </ToggleGroup>
                </div>
            </div>
        );
    }

    function renderBottomInputs() {
        return (
            showGroup &&
            compoundStyle.children.map((elementStyle) => (
                <motion.div
                    key={elementStyle.key}
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    className="flex flex-row items-center"
                >
                    <div className="w-12 text-foreground-onlook">
                        {DISPLAY_NAME_OVERRIDE[elementStyle.displayName] ||
                            elementStyle.displayName}
                    </div>
                    <TextInput elementStyle={elementStyle} />
                </motion.div>
            ))
        );
    }

    return (
        <div className="grid grid-cols-2 gap-2 my-2">
            {renderTopInput()}
            {renderBottomInputs()}
        </div>
    );
});

export default NestedInputs;

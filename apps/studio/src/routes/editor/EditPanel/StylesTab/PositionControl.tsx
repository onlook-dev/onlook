import { useEditorEngine } from '@/components/Context';
import type { CompoundStyleImpl } from '@/lib/editor/styles';
import { Icons } from '@onlook/ui/icons';
import { ToggleGroup, ToggleGroupItem } from '@onlook/ui/toggle-group';
import { observer } from 'mobx-react-lite';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import TextInput from './single/TextInput';

const PositionControl = observer(({ compoundStyle }: { compoundStyle: CompoundStyleImpl }) => {
    const editorEngine = useEditorEngine();
    const [showIndividualControls, setShowIndividualControls] = useState(false);

    useEffect(() => {
        const selectedStyle = editorEngine.style.selectedStyle;
        if (!selectedStyle) {
            return;
        }
        setShowIndividualControls(compoundStyle.isHeadSameAsChildren(selectedStyle.styles));
    }, [editorEngine.style.selectedStyle]);

    const onMainValueChanged = (key: string, value: string) => {
        overrideChildrenStyles(value);
    };

    const handleToggleGroupChange = (value: 'true' | 'false') => {
        setShowIndividualControls(value === 'true');

        if (value === 'false') {
            const styleRecord = editorEngine.style.selectedStyle;
            if (!styleRecord) {
                return;
            }
            const mainValue = compoundStyle.head.getValue(styleRecord.styles);
            const singleValue = mainValue.split(' ')[0] || '';
            editorEngine.style.update(compoundStyle.head.key, singleValue);
            overrideChildrenStyles(singleValue);
        }
    };

    const overrideChildrenStyles = (newValue: string) => {
        editorEngine.style.updateStyleNoAction(
            Object.fromEntries(
                compoundStyle.children.map((elementStyle) => [elementStyle.key, newValue]),
            ),
        );
    };

    const renderMainControl = () => (
        <div className="flex flex-row items-center justify-between w-full">
            <p className="text-xs text-foreground-onlook">{compoundStyle.head.displayName}</p>
            <div className="flex flex-row space-x-1">
                <TextInput elementStyle={compoundStyle.head} onValueChange={onMainValueChanged} />
                <ToggleGroup
                    size="sm"
                    type="single"
                    value={showIndividualControls ? 'true' : 'false'}
                    onValueChange={handleToggleGroupChange}
                >
                    <ToggleGroupItem
                        value="false"
                        className="data-[state=on]:bg-background-onlook/75 data-[state=on]:text-foreground-onlook"
                    >
                        <Icons.BorderAll className="w-4 h-4" />
                    </ToggleGroupItem>
                    <ToggleGroupItem
                        value="true"
                        className="data-[state=on]:bg-background-onlook/75 data-[state=on]:text-foreground-onlook"
                    >
                        <Icons.Plus className="w-4 h-4" />
                    </ToggleGroupItem>
                </ToggleGroup>
            </div>
        </div>
    );

    const renderPositionInputs = () => (
        <AnimatePresence>
            {showIndividualControls && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="grid grid-cols-3 gap-2 mt-2"
                >
                    {/* Top Input */}
                    <div className="col-start-2">
                        <TextInput elementStyle={compoundStyle.children[0]} />
                    </div>

                    {/* Left, Center, Right Inputs */}
                    <div className="flex items-center">
                        <TextInput elementStyle={compoundStyle.children[3]} />
                    </div>
                    <div className="flex items-center justify-center">
                        <div className="w-8 h-8 bg-background-onlook/75 rounded-md flex items-center justify-center">
                            <Icons.Plus className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="flex items-center">
                        <TextInput elementStyle={compoundStyle.children[1]} />
                    </div>

                    {/* Bottom Input */}
                    <div className="col-start-2">
                        <TextInput elementStyle={compoundStyle.children[2]} />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );

    return (
        <div className="my-2">
            {renderMainControl()}
            {renderPositionInputs()}
        </div>
    );
});

export default PositionControl;

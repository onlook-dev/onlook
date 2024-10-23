import { useEditorEngine } from '@/components/Context';
import { CompoundStyle, StyleType } from '@/lib/editor/styles/models';
import { motion } from 'framer-motion';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import ColorInput from '../single/ColorInput';
import NumberUnitInput from '../single/NumberUnitInput';
import SelectInput from '../single/SelectInput';
import TextInput from '../single/TextInput';

const BorderInput = observer(({ compoundStyle }: { compoundStyle: CompoundStyle }) => {
    const editorEngine = useEditorEngine();
    const [showGroup, setShowGroup] = useState(false);

    useEffect(() => {
        const selectedStyle = editorEngine.style.selectedStyle;
        if (!selectedStyle) {
            console.error('No style record found');
            return;
        }

        const colorValue = compoundStyle.head.getValue(selectedStyle.styles);
        setShowGroup(!isColorEmpty(colorValue));
    }, [editorEngine.style.selectedStyle]);

    const isColorEmpty = (colorValue: string) => {
        return colorValue === '' || colorValue === 'initial' || colorValue === 'transparent';
    };

    const onColorValueChange = (key: string, newColorValue: string) => {
        const styleRecord = editorEngine.style.selectedStyle;
        if (!styleRecord) {
            console.error('No style record found');
            return;
        }

        const borderWidthStyle = compoundStyle.children.find(
            (elementStyle) => elementStyle.key === 'borderWidth',
        );

        if (!borderWidthStyle) {
            console.error('Border width style not found');
            return;
        }

        const originalBorderWidth = borderWidthStyle.getValue(styleRecord.styles);
        let newBorderWidth = originalBorderWidth;
        const colorIsEmpty = isColorEmpty(newColorValue);

        if (colorIsEmpty) {
            if (newBorderWidth !== '0px') {
                newBorderWidth = '0px';
            }
        } else {
            if (newBorderWidth === '0px') {
                newBorderWidth = '1px';
            }
        }

        setShowGroup(!colorIsEmpty);
        if (newBorderWidth !== originalBorderWidth) {
            const inTransaction = editorEngine.history.isInTransaction;
            if (inTransaction) {
                editorEngine.history.commitTransaction();
            }
            editorEngine.style.updateElementStyle('borderWidth', newBorderWidth);
            if (inTransaction) {
                editorEngine.history.startTransaction();
            }
        }
    };

    function renderTopInput() {
        const elementStyle = compoundStyle.head;
        return (
            <div key={elementStyle.key} className="flex flex-row items-center col-span-2">
                <p className="text-xs text-left text-foreground-onlook">
                    {elementStyle.displayName}
                </p>
                <div className="ml-auto h-8 flex flex-row w-32 space-x-2">
                    <ColorInput elementStyle={elementStyle} onValueChange={onColorValueChange} />
                </div>
            </div>
        );
    }

    function renderBottomInputs() {
        if (!showGroup) {
            return null;
        }
        return (
            <motion.div
                key={compoundStyle.key}
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                className="flex flex-col gap-2"
            >
                {compoundStyle.children.map((elementStyle) => (
                    <div key={elementStyle.key} className="ml-2 flex flex-row items-center">
                        <div className="text-foreground-onlook">
                            <p className="text-xs text-left">{elementStyle.displayName}</p>
                        </div>
                        <div className="w-32 ml-auto">
                            {elementStyle.type === StyleType.Select ? (
                                <SelectInput elementStyle={elementStyle} />
                            ) : elementStyle.type === StyleType.Number ? (
                                <NumberUnitInput elementStyle={elementStyle} />
                            ) : (
                                <TextInput elementStyle={elementStyle} />
                            )}
                        </div>
                    </div>
                ))}
            </motion.div>
        );
    }

    return (
        <div className="flex flex-col gap-2 mb-2">
            {renderTopInput()}
            {renderBottomInputs()}
        </div>
    );
});

export default BorderInput;

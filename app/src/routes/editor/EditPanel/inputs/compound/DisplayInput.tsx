import { useEditorEngine } from '@/components/Context';
import { CompoundStyle, StyleType } from '@/lib/editor/styles/models';
import { motion } from 'framer-motion';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import NumberUnitInput from '../single/NumberUnitInput';
import SelectInput from '../single/SelectInput';
import TextInput from '../single/TextInput';
import GridRowColInput from './GridRowColInput';

enum DisplayType {
    flex = 'flex',
    grid = 'grid',
    block = 'block',
}

const DisplayTypeMap: Record<DisplayType, string[]> = {
    [DisplayType.block]: [],
    [DisplayType.flex]: ['flexDirection', 'justifyContent', 'alignItems', 'gap'],
    [DisplayType.grid]: ['gridTemplateColumns', 'gridTemplateRows', 'gap'],
};

const DisplayInput = observer(({ compoundStyle }: { compoundStyle: CompoundStyle }) => {
    const editorEngine = useEditorEngine();
    const [displayType, setDisplayType] = useState<DisplayType>(DisplayType.block);

    useEffect(() => {
        const styleRecord = editorEngine.style.selectedStyle;
        if (!styleRecord) {
            setDisplayType(compoundStyle.head.defaultValue as DisplayType);
            return;
        }

        const topValue = compoundStyle.head.getValue(styleRecord.styles);
        setDisplayType(topValue as DisplayType);
    }, [editorEngine.style.selectedStyle]);

    const onDisplayTypeChange = (key: string, value: string) => {
        setDisplayType(value as DisplayType);
    };

    function renderTopInput() {
        const elementStyle = compoundStyle.head;
        return (
            <div key={elementStyle.displayName} className="flex flex-row items-center col-span-2">
                <p className="text-xs text-left text-text">{elementStyle.displayName}</p>
                <div className="ml-auto h-8 flex flex-row w-32 space-x-2">
                    <SelectInput elementStyle={elementStyle} onValueChange={onDisplayTypeChange} />
                </div>
            </div>
        );
    }

    function renderBottomInputs() {
        return compoundStyle.children.map(
            (elementStyle) =>
                DisplayTypeMap[displayType].includes(elementStyle.key) && (
                    <motion.div
                        key={elementStyle.key}
                        className="ml-2 flex flex-row items-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div className="text-text">
                            <p className="text-xs text-left">{elementStyle.displayName}</p>
                        </div>
                        <div className="w-32 ml-auto">
                            {elementStyle.key === 'gridTemplateColumns' ||
                            elementStyle.key === 'gridTemplateRows' ? (
                                <GridRowColInput elementStyle={elementStyle} />
                            ) : elementStyle.type === StyleType.Select ? (
                                <SelectInput elementStyle={elementStyle} />
                            ) : elementStyle.type === StyleType.Number ? (
                                <NumberUnitInput elementStyle={elementStyle} />
                            ) : (
                                <TextInput elementStyle={elementStyle} />
                            )}
                        </div>
                    </motion.div>
                ),
        );
    }

    return (
        <div className="flex flex-col gap-2 mb-2">
            {renderTopInput()}
            {renderBottomInputs()}
        </div>
    );
});

export default DisplayInput;

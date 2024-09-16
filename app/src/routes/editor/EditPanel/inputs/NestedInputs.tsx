import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { constructChangeCurried } from '@/lib/editor/styles/inputs';
import { ElementStyle } from '@/lib/editor/styles/models';
import {
    BorderAllIcon,
    BorderBottomIcon,
    BorderLeftIcon,
    BorderRightIcon,
    BorderTopIcon,
    CornerBottomLeftIcon,
    CornerBottomRightIcon,
    CornersIcon,
    CornerTopLeftIcon,
    CornerTopRightIcon,
} from '@radix-ui/react-icons';
import { motion } from 'framer-motion';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { useEditorEngine } from '../..';
import TextInput from './primitives/TextInput';

const DISPLAY_NAME_OVERRIDE: Record<string, any> = {
    Top: <BorderTopIcon className="w-4 h-4" />,
    Bottom: <BorderBottomIcon className="w-4 h-4" />,
    Right: <BorderRightIcon className="w-4 h-4" />,
    Left: <BorderLeftIcon className="w-4 h-4" />,
    'Top Right': <CornerTopRightIcon className="w-4 h-4" />,
    'Top Left': <CornerTopLeftIcon className="w-4 h-4" />,
    'Bottom Right': <CornerBottomRightIcon className="w-4 h-4" />,
    'Bottom Left': <CornerBottomLeftIcon className="w-4 h-4" />,
};

const VALID_KEYS = ['margin', 'padding', 'borderRadius'];

const NestedInputs = observer(({ elementStyles: styles }: { elementStyles: ElementStyle[] }) => {
    const editorEngine = useEditorEngine();
    const [showGroup, setShowGroup] = useState(false);
    const [elementStyles, setElementStyles] = useState(styles);
    const constructChangeMultiple = elementStyles.map((style) =>
        constructChangeCurried(style.value),
    );

    useEffect(() => {
        setElementStyles(styles);
    }, [styles]);

    useEffect(() => {
        if (elementStyles) {
            const allElementsHaveSameValue = elementStyles.every(
                (style) => style.value === elementStyles[0].value,
            );
            setShowGroup(!allElementsHaveSameValue);
        }
    }, [elementStyles]);

    const onTopValueChanged = (key: string, value: string) => {
        setElementStyles(elementStyles.map((style) => ({ ...style, value })));
        elementStyles.forEach((elementStyle) => {
            if (elementStyle.key === key) {
                return;
            }
            editorEngine.style.updateElementStyle(
                elementStyle.key,
                constructChangeMultiple[elementStyles.indexOf(elementStyle)](value),
            );
        });
    };

    function renderTopInputs(elementStyle: ElementStyle) {
        return (
            <div
                key={`${elementStyle.key}-${elementStyle.group}-${elementStyle.subGroup}`}
                className="flex flex-row items-center col-span-2"
            >
                <p className="text-xs text-left text-text">{elementStyle.displayName}</p>
                <div className="ml-auto h-8 flex flex-row w-32 space-x-1">
                    <TextInput
                        elementStyle={showGroup ? { ...elementStyle, value: '' } : elementStyle}
                        onValueChange={onTopValueChanged}
                    />
                    <ToggleGroup
                        size="sm"
                        type="single"
                        value={showGroup ? 'true' : 'false'}
                        onValueChange={(val) => setShowGroup(val === 'true')}
                    >
                        <ToggleGroupItem value="false">
                            <BorderAllIcon className="w-4 h-5" />
                        </ToggleGroupItem>
                        <ToggleGroupItem value="true">
                            <CornersIcon className="w-4 h-5" />
                        </ToggleGroupItem>
                    </ToggleGroup>
                </div>
            </div>
        );
    }

    function renderBottomInputs(elementStyle: ElementStyle) {
        return (
            showGroup && (
                <motion.div
                    key={`${elementStyle.key}-${elementStyle.group}-${elementStyle.subGroup}`}
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    className="flex flex-row items-center"
                >
                    <div className="w-12 text-text">
                        {DISPLAY_NAME_OVERRIDE[elementStyle.displayName] ||
                            elementStyle.displayName}
                    </div>
                    <TextInput elementStyle={elementStyle} />
                </motion.div>
            )
        );
    }

    return (
        <div className="grid grid-cols-2 gap-2 my-2">
            {elementStyles.map((elementStyle) =>
                VALID_KEYS.includes(elementStyle.key)
                    ? renderTopInputs(elementStyle)
                    : renderBottomInputs(elementStyle),
            )}
        </div>
    );
});

export default NestedInputs;

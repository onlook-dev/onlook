import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ElementStyle } from '@/lib/editor/engine/styles/models';
import {
    BorderAllIcon,
    BorderBottomIcon,
    BorderLeftIcon,
    BorderRightIcon,
    BorderTopIcon,
    CornerBottomLeftIcon,
    CornerBottomRightIcon,
    CornerTopLeftIcon,
    CornerTopRightIcon,
    CornersIcon,
} from '@radix-ui/react-icons';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import TextInput from './TextInput';

interface Props {
    elementStyles: ElementStyle[];
    updateElementStyle: (key: string, value: any, immediate?: boolean) => void;
}

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

const NestedInputs = ({ elementStyles: styles, updateElementStyle }: Props) => {
    const [showGroup, setShowGroup] = useState(false);
    const [elementStyles, setStyles] = useState<ElementStyle[]>(styles);

    useEffect(() => {
        if (elementStyles) {
            setShowGroup(!elementStyles.every((style) => style.value === elementStyles[0].value));
        }
    }, [elementStyles]);

    const topElementUpdated = (key: string, value: any) => {
        updateElementStyle(key, value, true);
        setStyles(elementStyles.map((style) => ({ ...style, value })));
    };

    const bottomElementUpdated = (key: string, value: any) => {
        updateElementStyle(key, value, true);
        setStyles(elementStyles.map((style) => (style.key === key ? { ...style, value } : style)));
    };

    function renderTopInputs(elementStyle: ElementStyle) {
        return (
            <div
                key={`${elementStyle.key}-${elementStyle.group}-${elementStyle.subGroup}`}
                className="flex flex-row items-center col-span-2"
            >
                <p className="text-xs text-left text-tertiary">{elementStyle.displayName}</p>
                <div className="ml-auto h-8 flex flex-row w-32 space-x-2">
                    <TextInput
                        elementStyle={showGroup ? { ...elementStyle, value: '' } : elementStyle}
                        updateElementStyle={topElementUpdated}
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
                    <div className="w-12 text-tertiary">
                        {DISPLAY_NAME_OVERRIDE[elementStyle.displayName] ||
                            elementStyle.displayName}
                    </div>
                    <TextInput
                        elementStyle={elementStyle}
                        updateElementStyle={bottomElementUpdated}
                    />
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
};

export default NestedInputs;

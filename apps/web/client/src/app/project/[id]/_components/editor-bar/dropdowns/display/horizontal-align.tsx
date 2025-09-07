import { useEditorEngine } from '@/components/store/editor';
import { Icons } from '@onlook/ui/icons';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import type { CssValue } from '.';
import { InputRadio } from '../../inputs/input-radio';

const horizontalAlignOptions: Record<string, CssValue> = {
    'flex-start': {
        value: 'flex-start',
        label: 'Left',
        icon: <Icons.AlignLeft className="h-4 w-4" />,
    },
    center: {
        value: 'center',
        label: 'Center',
        icon: <Icons.AlignCenterHorizontally className="h-4 w-4" />,
    },
    'flex-end': {
        value: 'flex-end',
        label: 'Right',
        icon: <Icons.AlignRight className="h-4 w-4" />,
    },
    'space-between': {
        value: 'space-between',
        label: 'Space Between',
        icon: <Icons.SpaceBetweenHorizontally className="h-4 w-4" />,
    },
};

export const HorizontalAlignInput = observer(() => {
    const editorEngine = useEditorEngine();
    const [value, setValue] = useState<string>(
        editorEngine.style.selectedStyle?.styles.computed.justifyContent ?? 'flex-start',
    );

    useEffect(() => {
        setValue(editorEngine.style.selectedStyle?.styles.computed.justifyContent ?? 'flex-start');
    }, [editorEngine.style.selectedStyle?.styles.computed.justifyContent]);

    // Check if flexbox is active
    const displayValue = editorEngine.style.selectedStyle?.styles.computed.display;
    const isFlexboxActive = displayValue === 'flex' || displayValue === 'inline-flex';

    // Don't render if flexbox is not active
    if (!isFlexboxActive) {
        return null;
    }

    return (
        <div className="flex items-center gap-0">
            <span className="text-sm text-muted-foreground w-20">Horizontal</span>
            <InputRadio
                options={Object.values(horizontalAlignOptions)}
                value={value}
                onChange={(newValue) => {
                    setValue(newValue);
                    editorEngine.style.update('justify-content', newValue);
                }}
                className="flex-1"
            />
        </div>
    );
});

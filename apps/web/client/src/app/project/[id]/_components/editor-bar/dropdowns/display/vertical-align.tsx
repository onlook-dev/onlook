import { useEditorEngine } from '@/components/store/editor';
import { Icons } from '@onlook/ui/icons';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import type { CssValue } from '.';
import { InputRadio } from '../../inputs/input-radio';

const verticalAlignOptions: Record<string, CssValue> = {
    'flex-start': {
        value: 'flex-start',
        label: 'Top',
        icon: <Icons.AlignTop className="h-4 w-4" />,
    },
    center: {
        value: 'center',
        label: 'Center',
        icon: <Icons.AlignCenterVertically className="h-4 w-4" />,
    },
    'flex-end': {
        value: 'flex-end',
        label: 'Bottom',
        icon: <Icons.AlignBottom className="h-4 w-4" />,
    },
    stretch: {
        value: 'stretch',
        label: 'Stretch',
        icon: <Icons.SpaceBetweenVertically className="h-4 w-4" />,
    },
};

export const VerticalAlignInput = observer(() => {
    const editorEngine = useEditorEngine();
    const [value, setValue] = useState<string>(
        editorEngine.style.selectedStyle?.styles.computed.alignItems ?? 'flex-start',
    );

    useEffect(() => {
        setValue(editorEngine.style.selectedStyle?.styles.computed.alignItems ?? 'flex-start');
    }, [editorEngine.style.selectedStyle?.styles.computed.alignItems]);

    // Check if flexbox is active
    const displayValue = editorEngine.style.selectedStyle?.styles.computed.display;
    const isFlexboxActive = displayValue === 'flex' || displayValue === 'inline-flex';

    // Don't render if flexbox is not active
    if (!isFlexboxActive) {
        return null;
    }

    return (
        <div className="flex items-center gap-0">
            <span className="text-sm text-muted-foreground w-20">Vertical</span>
            <InputRadio
                options={Object.values(verticalAlignOptions)}
                value={value}
                onChange={(newValue) => {
                    setValue(newValue);
                    editorEngine.style.update('align-items', newValue);
                }}
                className="flex-1"
            />
        </div>
    );
});

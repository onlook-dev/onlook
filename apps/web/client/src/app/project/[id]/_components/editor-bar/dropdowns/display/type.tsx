import { useEditorEngine } from '@/components/store/editor';
import { useEffect, useState } from 'react';
import { InputRadio } from '../../inputs/input-radio';
import { layoutTypeOptions } from './index';

export const TypeInput = () => {
    const editorEngine = useEditorEngine();
    const [value, setValue] = useState<string>(
        editorEngine.style.selectedStyle?.styles.computed.display ?? 'block',
    );

    useEffect(() => {
        setValue(editorEngine.style.selectedStyle?.styles.computed.display ?? 'block');
    }, [editorEngine.style.selectedStyle?.styles.computed.display]);

    return (
        <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground w-24"> Type </span>
            <InputRadio
                options={Object.values(layoutTypeOptions)}
                value={value}
                onChange={(newValue) => {
                    setValue(newValue);
                    editorEngine.style.update('display', newValue);
                }}
                className="flex-1"
            />
        </div>
    );
};

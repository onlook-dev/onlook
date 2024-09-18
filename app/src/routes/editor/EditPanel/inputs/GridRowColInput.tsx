import { useEditorEngine } from '@/components/Context/Editor';
import { generateRowColumnTemplate, getRowColumnCount } from '@/lib/editor/styles/autolayout';
import { constructChangeCurried } from '@/lib/editor/styles/inputs';
import { ElementStyle } from '@/lib/editor/styles/models';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';

const GridRowColInput = observer(({ elementStyle }: { elementStyle: ElementStyle }) => {
    const editorEngine = useEditorEngine();
    const [value, setValue] = useState('');

    const constructChange = constructChangeCurried(value);

    useEffect(() => {
        setValue(getRowColumnCount(elementStyle.value).toString());
    }, [elementStyle]);

    const handleInput = (event: any) => {
        const updatedValue = generateRowColumnTemplate(event.target.value);
        editorEngine.style.updateElementStyle(elementStyle.key, constructChange(updatedValue));
        setValue(event.target.value);
    };

    return (
        <input
            type="number"
            className={`w-full p-[6px] text-xs px-2 rounded border-none text-active bg-bg/75 text-start focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
            placeholder="--"
            value={value}
            onInput={handleInput}
        />
    );
});

export default GridRowColInput;

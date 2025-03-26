import { useEditorEngine } from '@/components/Context';
import { FontFamily } from './FontFamily';
import { observer } from 'mobx-react-lite';
import { FONT_VARIANTS } from '.';
import { useEffect } from 'react';

const SystemFont = observer(() => {
    const editorEngine = useEditorEngine();
    const fontManager = editorEngine.font;

    useEffect(() => {
        fontManager.scanFonts();
        fontManager.getDefaultFont();
    }, []);

    return (
        <div className="flex flex-col divide-y divide-border">
            {fontManager.fonts.map((font, index) => (
                <div key={`system-${font.family}-${index}`}>
                    <div className="flex justify-between items-center">
                        <FontFamily
                            name={font.family}
                            variants={
                                font.weight?.map(
                                    (weight) => FONT_VARIANTS.find((v) => v.value === weight)?.name,
                                ) as string[]
                            }
                            isLast={index === fontManager.fonts.length - 1}
                            showDropdown={true}
                            showAddButton={false}
                            isDefault={font.id === fontManager.defaultFont}
                            onRemoveFont={() => fontManager.removeFont(font)}
                            onSetFont={() => fontManager.setDefaultFont(font)}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
});

export default SystemFont;

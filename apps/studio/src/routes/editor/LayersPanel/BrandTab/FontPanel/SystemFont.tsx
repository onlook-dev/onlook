import { useEditorEngine } from '@/components/Context';
import { FontFamily } from './FontFamily';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { FONT_VARIANTS } from '@onlook/models/constants';

const SystemFont = observer(() => {
    const editorEngine = useEditorEngine();
    const fontManager = editorEngine.font;

    useEffect(() => {
        fontManager.scanFonts();
        fontManager.getDefaultFont();
    }, []);

    return (
        <div className="flex flex-col divide-y divide-border">
            {!fontManager.fonts.length ? (
                <div className="flex justify-center items-center border-dashed border-default border-2 rounded-lg h-20 my-2">
                    <span className="text-sm text-muted-foreground">No fonts added</span>
                </div>
            ) : (
                fontManager.fonts.map((font, index) => (
                    <div key={`system-${font.family}-${index}`}>
                        <div className="flex justify-between items-center">
                            <FontFamily
                                name={font.family}
                                variants={
                                    font.weight?.map(
                                        (weight) =>
                                            FONT_VARIANTS.find((v) => v.value === weight)?.name,
                                    ) as string[]
                                }
                                showDropdown={true}
                                showAddButton={false}
                                isDefault={font.id === fontManager.defaultFont}
                                onRemoveFont={() => fontManager.removeFont(font)}
                                onSetFont={() => fontManager.setDefaultFont(font)}
                            />
                        </div>
                    </div>
                ))
            )}
        </div>
    );
});

export default SystemFont;

import { useEditorEngine } from '@/components/store/editor';
import { VARIANTS } from '@onlook/fonts';
import { Icons } from '@onlook/ui/icons/index';
import { observer } from 'mobx-react-lite';
import { FontFamily } from './font-family';

const SystemFont = observer(() => {
    const editorEngine = useEditorEngine();
    const fontManager = editorEngine.font;

    return (
        <div className="flex flex-col divide-y divide-border">
            {fontManager.isScanning ? (
                <div className="flex justify-center items-center border-dashed border-default border-2 rounded-lg h-20 my-2">
                    <div className="flex items-center gap-2">
                        <Icons.LoadingSpinner className="h-4 w-4 animate-spin text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Scanning fonts...</span>
                    </div>
                </div>
            ) : !fontManager.fonts.length ? (
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
                                        (weight) => VARIANTS.find((v) => v.value === weight)?.name,
                                    ).filter((v) => v !== undefined) ?? []
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

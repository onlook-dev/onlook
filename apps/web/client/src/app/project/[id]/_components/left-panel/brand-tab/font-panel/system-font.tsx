import { observer } from 'mobx-react-lite';

import { VARIANTS } from '@onlook/fonts';
import { Icons } from '@onlook/ui/icons/index';

import { useEditorEngine } from '@/components/store/editor';
import { FontFamily } from './font-family';

const SystemFont = observer(() => {
    const editorEngine = useEditorEngine();
    const fontManager = editorEngine.font;

    return (
        <div className="divide-border flex flex-col divide-y">
            {fontManager.isScanning ? (
                <div className="border-default my-2 flex h-20 items-center justify-center rounded-lg border-2 border-dashed">
                    <div className="flex items-center gap-2">
                        <Icons.LoadingSpinner className="text-muted-foreground h-4 w-4 animate-spin" />
                        <span className="text-muted-foreground text-sm">Scanning fonts...</span>
                    </div>
                </div>
            ) : !fontManager.fonts.length ? (
                <div className="border-default my-2 flex h-20 items-center justify-center rounded-lg border-2 border-dashed">
                    <span className="text-muted-foreground text-sm">No fonts added</span>
                </div>
            ) : (
                fontManager.fonts.map((font, index) => (
                    <div key={`system-${font.family}-${index}`}>
                        <div className="flex items-center justify-between">
                            <FontFamily
                                name={font.family}
                                variants={
                                    font.weight
                                        ?.map(
                                            (weight) =>
                                                VARIANTS.find((v) => v.value === weight)?.name,
                                        )
                                        .filter((v) => v !== undefined) ?? []
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

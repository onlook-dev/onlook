import { useEditorEngine } from '@/components/Context';
import { Button } from '@onlook/ui/button';
import { observer } from 'mobx-react-lite';
import { useCallback } from 'react';
import { MainChannels } from '/common/constants';
import type { ReactComponentDescriptor } from '/electron/main/code/components';

function ScanComponentsButton() {
    const editorEngine = useEditorEngine();

    const onClick = useCallback(async () => {
        const path = (await window.api.invoke(MainChannels.PICK_COMPONENTS_DIRECTORY)) as
            | string
            | null;

        if (path == null) {
            return;
        }

        const components = (await window.api.invoke(
            MainChannels.GET_COMPONENTS,
            path,
        )) as ReactComponentDescriptor[];
        editorEngine.projectInfo.components = components;
    }, [editorEngine]);

    return (
        <Button variant="outline" size="sm" className="" onClick={onClick}>
            Connect to Project
        </Button>
    );
}

const ComponentsTab = observer(({ components }: { components: ReactComponentDescriptor[] }) => {
    return (
        <div className="w-full">
            {components.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center">
                    <ScanComponentsButton />
                </div>
            ) : (
                components.map((component) => (
                    <div
                        className="flex-col pb-2 pl-2 cursor-pointer"
                        key={`${component.name}-${component.sourceFilePath}`}
                    >
                        <div className="font-bold">{component.name}</div>
                        <div className="opacity-50 text-sm">{component.sourceFilePath}</div>
                    </div>
                ))
            )}
        </div>
    );
});

export default ComponentsTab;

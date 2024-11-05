import { useEditorEngine } from '@/components/Context';
import { MainChannels } from '@onlook/models/constants';
import { Button } from '@onlook/ui/button';
import { observer } from 'mobx-react-lite';
import { useCallback } from 'react';
import type { ReactComponentDescriptor } from '/electron/main/code/components';
import { invokeMainChannel } from '@/lib/utils';

function ScanComponentsButton() {
    const editorEngine = useEditorEngine();

    const onClick = useCallback(async () => {
        const path = (await invokeMainChannel(MainChannels.PICK_COMPONENTS_DIRECTORY)) as
            | string
            | null;

        if (path == null) {
            return;
        }

        const components = (await invokeMainChannel(
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

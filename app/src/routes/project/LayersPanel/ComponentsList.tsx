import { observer } from 'mobx-react-lite';
import { ScanComponentsButton } from '.';
import { ReactComponentDescriptor } from '/electron/main/code/components';

export const ComponentsList = observer(
    ({ components }: { components: ReactComponentDescriptor[] }) => {
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
    },
);

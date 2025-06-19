import { useProjectManager } from '@/components/store/project';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { Versions } from './versions';

export const VersionsTab = observer(() => {
    const projectManager = useProjectManager();

    return (
        <div className="flex flex-col h-full relative text-sm">
            {/* {commits && commits.length > 0 ? (
                <>
                    <SavedVersions />
                    <Separator />
                </>
            ) : null} */}
            <Versions />
        </div>
    );
});
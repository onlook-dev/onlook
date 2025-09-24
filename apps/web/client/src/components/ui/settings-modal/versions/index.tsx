import { useEffect } from 'react';

import { useEditorEngine } from '@/components/store/editor';
import { Versions } from './versions';

export const VersionsTab = () => {
    const editorEngine = useEditorEngine();

    useEffect(() => {
        editorEngine.versions.listCommits();
    }, []);

    return (
        <div className="relative flex h-full flex-col text-sm">
            <Versions />
        </div>
    );
};

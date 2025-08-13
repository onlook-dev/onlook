import { useEditorEngine } from '@/components/store/editor';
import { useEffect } from 'react';
import { Versions } from './versions';

export const VersionsTab = () => {
    const editorEngine = useEditorEngine();

    useEffect(() => {
        editorEngine.versions.listCommits();
    }, []);

    return (
        <div className="flex flex-col h-full relative text-sm">
            <Versions />
        </div>
    );
};
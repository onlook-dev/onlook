import { observer } from 'mobx-react-lite';
import { Versions } from './versions';
import { useEffect } from 'react';
import { useEditorEngine } from '@/components/store/editor';

export const VersionsTab = observer(() => {
    const editorEngine = useEditorEngine();
    useEffect(() => {
        editorEngine.versions.listCommits();
    }, []);
    return (
        <div className="flex flex-col h-full relative text-sm">
            <Versions />
        </div>
    );
});
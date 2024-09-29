import * as monaco from 'monaco-editor';
import { useEffect, useRef } from 'react';

export const CodeEditor = () => {
    const editorContainer = useRef<HTMLDivElement | null>(null);
    const editor = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

    useEffect(() => {
        if (editorContainer.current) {
            editor.current = monaco.editor.create(editorContainer.current, {
                value: [
                    '// JavaScript Example',
                    'function greet(name) {',
                    '  return `Hello, ${name}!`;',
                    '}',
                    '',
                    "console.log(greet('World'));",
                ].join('\n'),
                language: 'javascript',
                theme: 'vs-dark',
                automaticLayout: true,
            });

            console.log(editor.current, editorContainer.current);
        }

        return () => {
            if (editorContainer.current) {
                editorContainer.current.dispose();
            }
        };
    }, []);

    return (
        <div className="w-full h-[400px] mt-20">
            <div ref={editorContainer} className="w-full h-full" />
        </div>
    );
};

"use client";

import { useEditorEngine } from "@/components/store";
import { observer } from "mobx-react-lite";
import { Frame } from "./frame";

export const Frames = observer(() => {
    const editorEngine = useEditorEngine();
    return (
        <div className="grid grid-flow-col gap-72">
            {editorEngine.canvas.frames.map((settings) => (
                <Frame key={settings.id} settings={settings} />
            ))}
        </div>
    );
});
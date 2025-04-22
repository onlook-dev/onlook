
import { createClient } from "@/utils/supabase/server";
import { FrameType, type Project, type WebFrame } from "@onlook/models";
import Main from "./_components/main";

export default async function Page({ params }: { params: { id: string } }) {
    const supabase = await createClient()
    const projectId = (await params).id;

    // TODO: Get project from supabase
    // const { data, error } = await supabase.from('your_table').select('*')

    const newFrame: WebFrame = {
        id: '1',
        // url: 'https://nmjn32-8084.csb.app',
        url: 'http://localhost:8084',
        position: { x: 200, y: 200 },
        dimension: { width: 500, height: 500 },
        type: FrameType.WEB,
    };

    const newProject: Project = {
        id: projectId,
        name: "My Project",
        previewUrl: '',
        metadata: {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            previewImg: null,
        },
        canvas: {
            scale: 1,
            frames: [newFrame],
            position: { x: 0, y: 0 },
        },
        domains: {
            base: null,
            custom: null,
        },
    };
    return <Main project={newProject} />
}

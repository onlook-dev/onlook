import { FrameType, type Project, type WebFrame } from "@onlook/models";
import { Main } from "./_components/main";

async function getProject(id: string) {
    "use server";
    // const supabase = await createClient();
    // const { data, error } = await supabase.from('projects').select('*').eq('id', id);
    // if (error) {
    //     throw new Error(error.message);
    // }

    const newFrame: WebFrame = {
        id: '1',
        url: 'https://jvj2lk-8084.csb.app',
        // url: 'http://localhost:8084',
        position: { x: 200, y: 200 },
        dimension: { width: 500, height: 500 },
        type: FrameType.WEB,
    };

    const project: Project = {
        id: id,
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
        sandbox: {
            id: 'jvj2lk',
            url: newFrame.url
        },
    };
    return project;
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const projectId = (await params).id;
    const project = await getProject(projectId);
    return (
        <Main project={project} />
    );
}



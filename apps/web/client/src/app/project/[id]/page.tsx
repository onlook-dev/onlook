
import { createClient } from "@/utils/supabase/server";
import type { Project } from "@onlook/models";
import Main from "./_components/main";

export default async function Page({ params }: { params: { id: string } }) {
    const supabase = await createClient()
    const projectId = (await params).id;

    // TODO: Get project from supabase
    // const { data, error } = await supabase.from('your_table').select('*')

    const newProject: Project = {
        id: projectId,
        name: "New Project",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        commands: {
            install: "npm install",
            run: "npm run dev",
            build: "npm run build",
        },
        previewImg: null,
        canvas: null,
        domains: {
            base: null,
            custom: null,
        },
    };
    return <Main project={newProject} />
}
